import { existsSync } from 'node:fs';
import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  type ButtonInteraction,
  type InteractionEditReplyOptions,
  type InteractionReplyOptions,
} from 'discord.js';
import { resourcesPanelReplyOptions } from './resourcesPanel.js';
import { bannerPath, roadmapBannerPath } from '../utils/paths.js';
import { battleJoinSlot1, battleJoinSlot2 } from '../features/battle/constants.js';
import { startMatchedBattle } from '../features/battle/handler.js';
import { claimLobbySlot } from '../features/battle/store.js';
import { customRoadmapIds, handleCustomRoadmap } from '../features/roadmap/handler.js';
import { buildRoadmapPdf } from '../features/roadmap/pdf.js';
import {
  getProgram,
  getProgramYears,
  getYearRoadmap,
  isProgramId,
  programs,
  type ProgramId,
} from '../features/roadmap/yearPlans.js';

const accentColor = 0xeb459e;
const bannerAttachmentName = 'banner.png';
const roadmapBannerName = 'Roadmap.png';

export const testCustomIds = {
  resources: 'test:resources',
  roadmap: 'test:roadmap',
  customRoadmap: customRoadmapIds.start,
  battleJoin1: battleJoinSlot1,
  battleJoin2: battleJoinSlot2,
  roadmapProgram: (program: ProgramId) => `test:roadmap:program:${program}`,
  roadmapYear: (program: ProgramId, year: string) => `test:roadmap:year:${program}:${year}`,
  roadmapPdf: (program: ProgramId, year: string) => `test:roadmap:pdf:${program}:${year}`,
  roadmapBack: 'test:roadmap:back',
  roadmapBackYears: (program: ProgramId) => `test:roadmap:back:${program}`,
} as const;

const roadmapProgramPattern = /^test:roadmap:program:(bca|mca)$/;
const roadmapYearPattern = /^test:roadmap:year:(bca|mca):([123])$/;
const roadmapPdfPattern = /^test:roadmap:pdf:(bca|mca):([123])$/;
const roadmapBackYearsPattern = /^test:roadmap:back:(bca|mca)$/;

const componentsV2 = MessageFlags.IsComponentsV2;
const ephemeralV2 = MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral;

function parseProgramId(value: string | undefined): ProgramId | undefined {
  return value && isProgramId(value) ? value : undefined;
}

function programButtons(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    ...programs.map((program) =>
      new ButtonBuilder()
        .setCustomId(testCustomIds.roadmapProgram(program.id))
        .setLabel(program.label)
        .setStyle(ButtonStyle.Secondary),
    ),
  );
}

function yearButtons(programId: ProgramId): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    ...getProgramYears(programId).map((year) =>
      new ButtonBuilder()
        .setCustomId(testCustomIds.roadmapYear(programId, year.id))
        .setLabel(year.label)
        .setStyle(ButtonStyle.Secondary),
    ),
  );
}

function bannerGallery(): MediaGalleryBuilder {
  return new MediaGalleryBuilder().addItems(
    new MediaGalleryItemBuilder()
      .setURL(`attachment://${bannerAttachmentName}`)
      .setDescription('BCA Hub'),
  );
}

function roadmapBannerGallery(): MediaGalleryBuilder {
  return new MediaGalleryBuilder().addItems(
    new MediaGalleryItemBuilder().setURL(`attachment://${roadmapBannerName}`).setDescription('Roadmap'),
  );
}

function roadmapBannerFiles(): AttachmentBuilder[] {
  if (!existsSync(roadmapBannerPath)) {
    return [];
  }

  return [new AttachmentBuilder(roadmapBannerPath, { name: roadmapBannerName })];
}

function chunkText(text: string, size = 3600): string[] {
  const chunks: string[] = [];
  const lines = text.split('\n');
  let current = '';
  for (const line of lines) {
    const next = current ? `${current}\n${line}` : line;
    if (next.length > size && current) {
      chunks.push(current);
      current = line;
    } else {
      current = next;
    }
  }
  if (current) {
    chunks.push(current);
  }
  return chunks;
}

export function buildTestPanel(): ContainerBuilder {
  return new ContainerBuilder()
    .setAccentColor(accentColor)
    .addMediaGalleryComponents(bannerGallery())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          '## What is a BCA degree?',
          'Bachelor of Computer Applications (BCA) is a **3-year undergraduate** program focused on software, programming, and computer science fundamentals.',
          '',
          'You typically study programming, databases, web development, operating systems, and networking — then use that base for internships, jobs, or further study like MCA.',
          '',
          '## What is an MCA degree?',
          'Master of Computer Applications (MCA) is a **2-year postgraduate** program that builds on BCA (or a similar CS background).',
          '',
          'It goes deeper into software engineering, advanced programming, data, systems, and project work — often used as a path toward software roles, specialization, or research-oriented study.',
        ].join('\n'),
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          '## Before You Start',
          '- BCA/MCA requires self learning — we can only assist you with it.',
          '- Have **commitment** and **passion**.',
          '- Please provide all required information and wait patiently instead of repeatedly pinging staff.',
        ].join('\n'),
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('**What this bot offers to you:**'),
    )
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(testCustomIds.resources)
          .setLabel('Resources')
          .setEmoji('📚')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(testCustomIds.roadmap)
          .setLabel('Roadmap')
          .setEmoji('🗺️')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(testCustomIds.customRoadmap)
          .setLabel('Personalized Roadmap')
          .setEmoji('🛣️')
          .setStyle(ButtonStyle.Secondary),
      ),
    );
}

function buildRoadmapProgramPicker(): ContainerBuilder {
  const files = roadmapBannerFiles();
  const container = new ContainerBuilder().setAccentColor(accentColor);
  if (files.length) {
    container.addMediaGalleryComponents(roadmapBannerGallery());
  }

  return container
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          '## Roadmap',
          'Choose your program, then pick a year for a full plan — subjects, skills, habits, and links.',
          '',
          ...programs.map((program) => `- **${program.label}** — ${program.blurb}`),
        ].join('\n'),
      ),
    )
    .addActionRowComponents(programButtons());
}

function buildRoadmapYearPicker(programId: ProgramId): ContainerBuilder {
  const files = roadmapBannerFiles();
  const container = new ContainerBuilder().setAccentColor(accentColor);
  if (files.length) {
    container.addMediaGalleryComponents(roadmapBannerGallery());
  }

  const program = getProgram(programId);
  const title = program ? `${program.label} Roadmap` : 'Roadmap';
  const hint =
    programId === 'mca'
      ? 'Pick your year for a full MCA plan — subjects, skills, internships, and links.'
      : 'Pick your year for a full BCA plan — subjects, skills, habits, and links.';

  return container
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(['## ' + title, hint].join('\n')))
    .addActionRowComponents(yearButtons(programId))
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(testCustomIds.roadmapBack)
          .setLabel('Back')
          .setStyle(ButtonStyle.Primary),
      ),
    );
}

function buildYearRoadmap(programId: ProgramId, yearId: string, yearLabel: string): ContainerBuilder {
  const files = roadmapBannerFiles();
  const container = new ContainerBuilder().setAccentColor(accentColor);
  if (files.length) {
    container.addMediaGalleryComponents(roadmapBannerGallery());
  }

  const program = getProgram(programId);
  const body =
    getYearRoadmap(programId, yearId) ?? `## ${program?.label ?? ''} ${yearLabel} Roadmap\nContent is not available yet.`;
  for (const chunk of chunkText(body)) {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(chunk));
  }

  return container.addActionRowComponents(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(testCustomIds.roadmapPdf(programId, yearId))
        .setLabel('Download PDF')
        .setEmoji('📄')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(testCustomIds.roadmapBackYears(programId))
        .setLabel('Back')
        .setStyle(ButtonStyle.Primary),
    ),
  );
}

function roadmapReplyOptions(container: ContainerBuilder): InteractionReplyOptions & InteractionEditReplyOptions {
  return {
    flags: ephemeralV2,
    files: roadmapBannerFiles(),
    components: [container],
  };
}

export function testPanelReplyOptions(): InteractionEditReplyOptions {
  return {
    flags: componentsV2,
    files: [new AttachmentBuilder(bannerPath, { name: bannerAttachmentName })],
    components: [buildTestPanel()],
  };
}

async function handleLobbyJoin(interaction: ButtonInteraction, slot: 1 | 2): Promise<void> {
  const member = interaction.member;
  const name =
    member && 'displayName' in member && typeof member.displayName === 'string'
      ? member.displayName
      : interaction.user.displayName;

  const result = claimLobbySlot(slot, { id: interaction.user.id, name });
  if (!result.ok) {
    const reasons = {
      taken: 'That slot is already taken. Use the other Join button.',
      already: 'You already joined this queue.',
      in_battle: 'You are already in an active battle.',
    } as const;

    await interaction.reply({
      content: reasons[result.reason],
      ephemeral: true,
    });
    return;
  }

  await interaction.update({
    flags: componentsV2,
    components: [buildTestPanel()],
  });

  if (!result.matched) {
    return;
  }

  const threadUrl = await startMatchedBattle(interaction.client, result.playerA, result.playerB);
  await interaction.followUp({
    content: threadUrl
      ? `Matched **${result.playerA.name}** vs **${result.playerB.name}**. Head to the thread: ${threadUrl}`
      : 'Both players joined, but the battle thread could not be created. Check bot permissions.',
    ephemeral: true,
  });
}

export async function handleTestComponent(interaction: ButtonInteraction): Promise<void> {
  if (await handleCustomRoadmap(interaction)) {
    return;
  }

  if (interaction.customId === testCustomIds.resources) {
    await interaction.reply(resourcesPanelReplyOptions(true));
    return;
  }

  if (interaction.customId === testCustomIds.battleJoin1) {
    await handleLobbyJoin(interaction, 1);
    return;
  }

  if (interaction.customId === testCustomIds.battleJoin2) {
    await handleLobbyJoin(interaction, 2);
    return;
  }

  if (interaction.customId === testCustomIds.roadmap) {
    await interaction.reply(roadmapReplyOptions(buildRoadmapProgramPicker()));
    return;
  }

  if (interaction.customId === testCustomIds.roadmapBack) {
    await interaction.update(roadmapReplyOptions(buildRoadmapProgramPicker()));
    return;
  }

  const backYearsProgram = parseProgramId(roadmapBackYearsPattern.exec(interaction.customId)?.[1]);
  if (backYearsProgram) {
    await interaction.update(roadmapReplyOptions(buildRoadmapYearPicker(backYearsProgram)));
    return;
  }

  const selectedProgram = parseProgramId(roadmapProgramPattern.exec(interaction.customId)?.[1]);
  if (selectedProgram) {
    await interaction.update(roadmapReplyOptions(buildRoadmapYearPicker(selectedProgram)));
    return;
  }

  const roadmapPdfMatch = roadmapPdfPattern.exec(interaction.customId);
  const pdfProgram = parseProgramId(roadmapPdfMatch?.[1]);
  if (roadmapPdfMatch && pdfProgram) {
    const programId = pdfProgram;
    const year = getProgramYears(programId).find((item) => item.id === roadmapPdfMatch[2]);
    const body = year ? getYearRoadmap(programId, year.id) : undefined;
    const program = getProgram(programId);
    if (!year || !body || !program) {
      await interaction.reply({
        content: 'That year roadmap is not available yet.',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    const pdf = await buildRoadmapPdf(
      `${program.label} ${year.label} Roadmap`,
      'BCA Hub · year plan',
      body,
    );
    await interaction.editReply({
      content: `Your **${program.label} ${year.label}** roadmap PDF is ready.`,
      files: [
        new AttachmentBuilder(pdf, {
          name: `${program.label.toLowerCase()}-${year.label.toLowerCase().replace(/\s+/g, '-')}-roadmap.pdf`,
        }),
      ],
    });
    return;
  }

  const roadmapYearMatch = roadmapYearPattern.exec(interaction.customId);
  const yearProgram = parseProgramId(roadmapYearMatch?.[1]);
  if (!roadmapYearMatch || !yearProgram) {
    return;
  }

  const programId = yearProgram;
  const year = getProgramYears(programId).find((item) => item.id === roadmapYearMatch[2]);
  if (!year) {
    return;
  }

  await interaction.update(roadmapReplyOptions(buildYearRoadmap(programId, year.id, year.label)));
}
