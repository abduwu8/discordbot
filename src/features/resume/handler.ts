import { existsSync } from 'node:fs';
import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  FileUploadBuilder,
  LabelBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  ModalBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
  type Attachment,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type InteractionEditReplyOptions,
  type InteractionReplyOptions,
  type ModalSubmitInteraction,
} from 'discord.js';
import { resumeBannerPath } from '../../utils/paths.js';
import { extractResumeText, fileKind } from './extract.js';
import { optimizeResume } from './groq.js';
import { buildResumeLatex } from './latex.js';
import { buildResumePdf, resumeFileBase } from './pdf.js';
import { formatResumeCooldown, resumeCooldownLeftMs, saveResumeCooldown } from './store.js';

export const resumeUploadId = 'resume:upload';
export const resumeModalId = 'resume:modal';

const accentColor = 0x3b9eff;
const bannerName = 'resume.png';
const maxBytes = 8 * 1024 * 1024;
const componentsV2 = MessageFlags.IsComponentsV2;
const ephemeralV2 = MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral;

function bannerFiles(): AttachmentBuilder[] {
  if (!existsSync(resumeBannerPath)) {
    return [];
  }
  return [new AttachmentBuilder(resumeBannerPath, { name: bannerName })];
}

function bannerGallery(): MediaGalleryBuilder {
  return new MediaGalleryBuilder().addItems(
    new MediaGalleryItemBuilder().setURL(`attachment://${bannerName}`).setDescription('Resume optimizer'),
  );
}

function startContainer(): ContainerBuilder {
  const container = new ContainerBuilder().setAccentColor(accentColor);
  if (bannerFiles().length) {
    container.addMediaGalleryComponents(bannerGallery());
  }
  return container;
}

export function buildResumePanel(): ContainerBuilder {
  return startContainer()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          '# Resume Optimizer',
          'Upload your resume here. The bot rewrites it with AI and sends you a **LaTeX-style PDF** plus the **.tex** source.',
          '',
          '- Use **PDF**, **Word (.docx)**, or **text**.',
          '- Only **you** see the result.',
          '- Optional target role in the form (e.g. Junior Accountant).',
          '- **24 hour cooldown** after a successful run.',
          '',
          'Please drop a review in <#1553823058882601111>. It helps us improve the bot.',
        ].join('\n'),
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
    )
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(resumeUploadId)
          .setLabel('Upload resume')
          .setEmoji('📄')
          .setStyle(ButtonStyle.Primary),
      ),
    );
}

function answerContainer(body: string): ContainerBuilder {
  return startContainer()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent('## Resume optimizer'))
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
}

function notice(body: string): InteractionReplyOptions {
  return {
    flags: ephemeralV2,
    files: bannerFiles(),
    components: [answerContainer(body)],
  };
}

function cooldownNotice(userId: string, leftMs: number): string {
  return [
    `You already used this recently, <@${userId}>.`,
    `Try again in **${formatResumeCooldown(leftMs)}**.`,
  ].join('\n');
}

export async function postResumePanel(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();
  await interaction.editReply({
    flags: componentsV2,
    files: bannerFiles(),
    components: [buildResumePanel()],
  });
}

export async function handleResumeButton(interaction: ButtonInteraction): Promise<boolean> {
  if (interaction.customId !== resumeUploadId) {
    return false;
  }

  const left = resumeCooldownLeftMs(interaction.user.id);
  if (left > 0) {
    await interaction.reply(notice(cooldownNotice(interaction.user.id, left)));
    return true;
  }

  const modal = new ModalBuilder()
    .setCustomId(resumeModalId)
    .setTitle('Optimize resume')
    .addLabelComponents(
      new LabelBuilder()
        .setLabel('Resume file')
        .setDescription('PDF, Word (.docx), or TXT')
        .setFileUploadComponent(
          new FileUploadBuilder()
            .setCustomId('file')
            .setRequired(true)
            .setMinValues(1)
            .setMaxValues(1),
        ),
      new LabelBuilder()
        .setLabel('Target role (optional)')
        .setDescription('Leave blank to keep your current direction')
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId('target')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(80)
            .setPlaceholder('Junior Accountant'),
        ),
    );

  await interaction.showModal(modal);
  return true;
}

async function processUploadedResume(
  interaction: ModalSubmitInteraction,
  file: Attachment,
  target: string | undefined,
): Promise<void> {
  if (file.size > maxBytes) {
    await interaction.editReply({ content: 'That file is too large. Upload a resume under **8 MB**.' });
    return;
  }

  if (!fileKind(file.name, file.contentType)) {
    await interaction.editReply({ content: 'Upload a **PDF**, **Word (.docx)**, or **text** resume.' });
    return;
  }

  const downloaded = await fetch(file.url);
  if (!downloaded.ok) {
    await interaction.editReply({ content: 'Could not download that attachment. Try uploading it again.' });
    return;
  }

  const data = Buffer.from(await downloaded.arrayBuffer());
  let text: string;
  try {
    text = await extractResumeText(data, file.name, file.contentType);
  } catch (error: unknown) {
    await interaction.editReply({
      content: error instanceof Error ? error.message : 'Could not read that resume.',
    });
    return;
  }

  if (text.length < 80) {
    await interaction.editReply({
      content: 'I could not read enough text from that file. Try a text-based PDF, .docx, or .txt export.',
    });
    return;
  }

  const resume = await optimizeResume(text, target);
  if (!resume) {
    await interaction.editReply({
      content:
        'Resume AI is unavailable right now. Try again in a bit — this did not start your cooldown.',
    });
    return;
  }

  saveResumeCooldown(interaction.user.id);
  const pdf = await buildResumePdf(resume);
  const tex = Buffer.from(buildResumeLatex(resume), 'utf8');
  const base = resumeFileBase(resume.name);
  const changes = resume.improvements.length
    ? resume.improvements.map((item) => `- ${item}`).join('\n')
    : '- Tightened wording and formatted it as a one-page professional resume.';

  const payload: InteractionEditReplyOptions = {
    content: [
      `Optimized **${resume.name}**${target ? ` for **${target}**` : ''}.`,
      '',
      '**What changed**',
      changes,
      '',
      'Attached: print-ready **PDF** (LaTeX-style layout) and the **.tex** source.',
    ].join('\n'),
    files: [
      new AttachmentBuilder(pdf, { name: `${base}.pdf` }),
      new AttachmentBuilder(tex, { name: `${base}.tex` }),
    ],
  };
  await interaction.editReply(payload);
}

export async function handleResumeModal(interaction: ModalSubmitInteraction): Promise<boolean> {
  if (interaction.customId !== resumeModalId) {
    return false;
  }

  const left = resumeCooldownLeftMs(interaction.user.id);
  if (left > 0) {
    await interaction.reply(notice(cooldownNotice(interaction.user.id, left)));
    return true;
  }

  const uploaded = interaction.fields.getUploadedFiles('file', true);
  const file = uploaded.first();
  if (!file) {
    await interaction.reply(notice('Upload a resume file in the form.'));
    return true;
  }

  let target: string | undefined;
  try {
    target = interaction.fields.getTextInputValue('target').trim() || undefined;
  } catch {
    target = undefined;
  }
  await interaction.deferReply({ ephemeral: true });
  await processUploadedResume(interaction, file, target);
  return true;
}
