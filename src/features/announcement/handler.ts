import {
  AttachmentBuilder,
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  type Attachment,
  type ChatInputCommandInteraction,
  type InteractionEditReplyOptions,
} from 'discord.js';

const accentColor = 0x5865f2;
const bannerNameBase = 'announcement';
const maxBytes = 8 * 1024 * 1024;
const textDisplayLimit = 4000;
const componentsV2 = MessageFlags.IsComponentsV2;

const allowedTypes = new Map<string, string>([
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['image/jpg', 'jpg'],
  ['image/gif', 'gif'],
  ['image/webp', 'webp'],
]);

function thinDivider(): SeparatorBuilder {
  return new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);
}

function extensionFor(file: Attachment): string | undefined {
  const type = file.contentType?.toLowerCase();
  if (type) {
    const fromType = allowedTypes.get(type);
    if (fromType) {
      return fromType;
    }
  }

  const name = file.name?.toLowerCase() ?? '';
  if (name.endsWith('.jpeg')) {
    return 'jpg';
  }
  const match = name.match(/\.(png|jpg|gif|webp)$/);
  return match?.[1];
}

function chunkText(text: string): string[] {
  if (text.length <= textDisplayLimit) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > textDisplayLimit) {
    const window = remaining.slice(0, textDisplayLimit);
    const breakAt = window.lastIndexOf('\n');
    const splitAt = breakAt > 500 ? breakAt : textDisplayLimit;
    chunks.push(remaining.slice(0, splitAt).trimEnd());
    remaining = remaining.slice(splitAt).trimStart();
  }
  if (remaining.length) {
    chunks.push(remaining);
  }
  return chunks;
}

function buildPanel(title: string | undefined, body: string, hasImage: boolean, bannerName: string): ContainerBuilder {
  const container = new ContainerBuilder().setAccentColor(accentColor);

  if (hasImage) {
    container
      .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(`attachment://${bannerName}`).setDescription('Announcement'),
        ),
      )
      .addSeparatorComponents(thinDivider());
  }

  if (title) {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${title}`));
    container.addSeparatorComponents(thinDivider());
  }

  for (const [index, chunk] of chunkText(body).entries()) {
    if (index > 0) {
      container.addSeparatorComponents(thinDivider());
    }
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(chunk));
  }

  return container;
}

function payload(
  container: ContainerBuilder,
  files: AttachmentBuilder[],
): InteractionEditReplyOptions {
  return {
    flags: componentsV2,
    components: [container],
    files,
    allowedMentions: { parse: ['users', 'roles', 'everyone'] },
  };
}

export async function postAnnouncement(interaction: ChatInputCommandInteraction): Promise<void> {
  const body = interaction.options.getString('text', true).trim();
  const titleRaw = interaction.options.getString('title')?.trim();
  const title = titleRaw ? titleRaw.replace(/\s+/g, ' ').slice(0, 200) : undefined;
  const image = interaction.options.getAttachment('image');

  if (!body) {
    await interaction.reply({ content: 'Announcement text cannot be empty.', ephemeral: true });
    return;
  }

  let bannerName: string | undefined;
  if (image) {
    const extension = extensionFor(image);
    if (!extension) {
      await interaction.reply({
        content: 'Use a **PNG**, **JPG**, **GIF**, or **WebP** image.',
        ephemeral: true,
      });
      return;
    }
    if (image.size > maxBytes) {
      await interaction.reply({
        content: 'That image is too large. Keep it under **8 MB**.',
        ephemeral: true,
      });
      return;
    }
    bannerName = `${bannerNameBase}.${extension}`;
  }

  await interaction.deferReply();

  const files: AttachmentBuilder[] = [];
  if (image && bannerName) {
    const downloaded = await fetch(image.url);
    if (!downloaded.ok) {
      await interaction.editReply({
        content: 'Could not download that image. Try uploading it again.',
      });
      return;
    }
    const data = Buffer.from(await downloaded.arrayBuffer());
    files.push(new AttachmentBuilder(data, { name: bannerName }));
  }

  const container = buildPanel(title, body, Boolean(bannerName), bannerName ?? `${bannerNameBase}.png`);
  await interaction.editReply(payload(container, files));
}
