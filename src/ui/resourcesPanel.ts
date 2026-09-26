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
  type InteractionEditReplyOptions,
  type InteractionReplyOptions,
} from 'discord.js';
import { semicolonyResources } from '../data/semicolonyResources.js';
import { resourcesBannerPath } from '../utils/paths.js';

const accentColor = 0x57f287;
const bannerName = 'Resources.png';
const componentsV2 = MessageFlags.IsComponentsV2;
const buttonsPerRow = 5;

export function resourcesBannerFiles(): AttachmentBuilder[] {
  if (!existsSync(resourcesBannerPath)) {
    return [];
  }

  return [new AttachmentBuilder(resourcesBannerPath, { name: bannerName })];
}

function resourcesBannerGallery(): MediaGalleryBuilder {
  return new MediaGalleryBuilder().addItems(
    new MediaGalleryItemBuilder().setURL(`attachment://${bannerName}`).setDescription('Resources'),
  );
}

function resourceButtonRows(): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];

  for (let index = 0; index < semicolonyResources.length; index += buttonsPerRow) {
    const slice = semicolonyResources.slice(index, index + buttonsPerRow);
    rows.push(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        ...slice.map((resource) =>
          new ButtonBuilder()
            .setLabel(resource.label)
            .setStyle(ButtonStyle.Link)
            .setURL(resource.url),
        ),
      ),
    );
  }

  return rows;
}

export function buildResourcesPanel(): ContainerBuilder {
  const files = resourcesBannerFiles();
  const container = new ContainerBuilder().setAccentColor(accentColor);

  if (files.length) {
    container.addMediaGalleryComponents(resourcesBannerGallery());
  }

  container
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          '# Resources',
          'Open a Semicolony roadmap for the topic you want. Each button opens the matching track in your browser.',
          '',
          'Mathematics currently has **no dedicated Semicolony roadmap**. Full stack is split into **Frontend** and **Backend**.',
        ].join('\n'),
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
    );

  for (const row of resourceButtonRows()) {
    container.addActionRowComponents(row);
  }

  return container;
}

export function resourcesPanelReplyOptions(
  ephemeral = false,
): InteractionReplyOptions & InteractionEditReplyOptions {
  return {
    flags: ephemeral ? componentsV2 | MessageFlags.Ephemeral : componentsV2,
    files: resourcesBannerFiles(),
    components: [buildResourcesPanel()],
  };
}
