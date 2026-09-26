import { existsSync } from 'node:fs';
import {
  AttachmentBuilder,
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  type InteractionEditReplyOptions,
} from 'discord.js';
import { rulesBannerPath } from '../utils/paths.js';

const accentColor = 0x3b82f6;
const rulesBannerName = 'rules.png';
const componentsV2 = MessageFlags.IsComponentsV2;

function rulesBannerFiles(): AttachmentBuilder[] {
  if (!existsSync(rulesBannerPath)) {
    return [];
  }

  return [new AttachmentBuilder(rulesBannerPath, { name: rulesBannerName })];
}

function rulesBannerGallery(): MediaGalleryBuilder {
  return new MediaGalleryBuilder().addItems(
    new MediaGalleryItemBuilder().setURL(`attachment://${rulesBannerName}`).setDescription('Server Rules'),
  );
}

export function buildRulesPanel(): ContainerBuilder {
  const files = rulesBannerFiles();
  const container = new ContainerBuilder().setAccentColor(accentColor);

  if (files.length) {
    container.addMediaGalleryComponents(rulesBannerGallery());
  }

  return container
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          '# Server Rules',
          'Welcome to **BCA/MCA Community**. Read these once, then enjoy the community.',
          'Breaking them can mean a warning, mute, or ban — staff decide based on context.',
        ].join('\n'),
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          '## Be respectful',
          '1. Treat everyone with respect — no harassment, hate, slurs, or personal attacks.',
          '2. Keep debates about ideas. Do not attack people.',
          '3. Do not share anyone’s private info (doxxing, screenshots of DMs without consent).',
        ].join('\n'),
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          '## Keep the space usable',
          '4. Stay on topic for each channel. Use the right place for help, progress, and off-topic chat.',
          '5. No spam, flood, or repeated pings. Ask once, wait, then follow up.',
          '6. No advertising, self-promo, or recruiting unless staff allow it in that channel.',
          '7. English or the server’s common language in public channels so others can join in.',
        ].join('\n'),
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          '## Content & academic honesty',
          '8. No NSFW, gore, or illegal content. Keep memes PG.',
          '9. Do not cheat, share exam leaks, or ask others to do your assignments for you.',
          '10. Help others learn — explain, don’t just dump the finished answer.',
          '11. Credit sources when you share notes, code, or resources.',
        ].join('\n'),
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          '## Where to go',
          '- <#1553359694985170964> — bot tools: resources, custom roadmap, and more.',
          '- <#1553301984520704005> — introduce yourself here.',
          '- <#1553364760010035200> — optimize and format your resume.',
        ].join('\n'),
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          '## Staff & Discord',
          '12. Follow Discord’s [Terms of Service](https://discord.com/terms) and [Community Guidelines](https://discord.com/guidelines).',
          '13. Staff decisions stand. If you disagree, open a ticket — do not argue in public.',
          '14. Introducing yourself in the intro channel helps us help you faster.',
          '',
          '*Thanks for keeping BCA/MCA Community a place people actually want to study in.*',
        ].join('\n'),
      ),
    );
}

export function rulesPanelReplyOptions(): InteractionEditReplyOptions {
  return {
    flags: componentsV2,
    files: rulesBannerFiles(),
    components: [buildRulesPanel()],
  };
}
