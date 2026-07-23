import beijingArtwork from '../assets/characters/beijing-2.png';
import birthdayArtwork from '../assets/characters/birthday.png';
import chengduArtwork from '../assets/characters/chengdu-2.png';
import jiujiangArtwork from '../assets/characters/jiujiang.png';
import ningboArtwork from '../assets/characters/ningbo-2.png';
import xiaoyunArtwork from '../assets/characters/xiaoyun.png';


export const themePresets = {
  aurora: {
    id: 'aurora',
    name: '主题 A',
    defaultCharacterPack: 'xiaoyun',
    characterPackIds: ['xiaoyun', 'jiujiang', 'ningbo'],
    tokens: {
      light: {
        colorPrimary: '#4f83ad',
        colorPrimaryHover: '#3d7099',
        colorPrimarySoft: '#eaf3f9',
        colorOnPrimary: '#ffffff',
        colorAccent: '#8b7ec3',
        colorSurface: '#fdfefe',
        colorSurfaceRaised: '#ffffff',
        colorSurfaceMuted: '#f2f6fa',
        colorText: '#203047',
        colorTextMuted: '#718096',
        colorBorder: '#dce5ed',
        colorFocus: 'rgba(79, 131, 173, 0.24)',
        colorDanger: '#d75d73',
        colorSuccess: '#3c9876',
        colorWarning: '#c58a37',
        colorInfo: '#4f83ad',
        gradientPrimary: 'linear-gradient(135deg, #4f83ad 0%, #7778b8 100%)',
        shadowCard: '0 12px 32px rgba(50, 76, 108, 0.10)',
        shadowFloating: '0 18px 46px rgba(45, 67, 96, 0.16)',
        radiusSmall: '8px',
        radiusMedium: '13px',
        radiusLarge: '20px',
      },
      dark: {
        colorPrimary: '#79b4d8',
        colorPrimaryHover: '#96cae6',
        colorPrimarySoft: '#183b51',
        colorOnPrimary: '#102331',
        colorAccent: '#aaa0e0',
        colorSurface: '#162132',
        colorSurfaceRaised: '#1d2a3e',
        colorSurfaceMuted: '#101927',
        colorText: '#edf4fb',
        colorTextMuted: '#9eacc0',
        colorBorder: '#334158',
        colorFocus: 'rgba(121, 180, 216, 0.30)',
        colorDanger: '#ef8193',
        colorSuccess: '#72c8a6',
        colorWarning: '#e5b769',
        colorInfo: '#79b4d8',
        gradientPrimary: 'linear-gradient(135deg, #79b4d8 0%, #aaa0e0 100%)',
        shadowCard: '0 14px 36px rgba(0, 0, 0, 0.28)',
        shadowFloating: '0 20px 50px rgba(0, 0, 0, 0.38)',
        radiusSmall: '8px',
        radiusMedium: '13px',
        radiusLarge: '20px',
      },
    },
  },
  celebration: {
    id: 'celebration',
    name: '主题 B',
    defaultCharacterPack: 'birthday',
    characterPackIds: ['birthday', 'beijing', 'chengdu'],
    tokens: {
      light: {
        colorPrimary: '#cf7097',
        colorPrimaryHover: '#b95b84',
        colorPrimarySoft: '#fcebf2',
        colorOnPrimary: '#ffffff',
        colorAccent: '#e5a142',
        colorSurface: '#fffdfd',
        colorSurfaceRaised: '#ffffff',
        colorSurfaceMuted: '#fbf5f7',
        colorText: '#432c37',
        colorTextMuted: '#8b7180',
        colorBorder: '#eadce3',
        colorFocus: 'rgba(207, 112, 151, 0.25)',
        colorDanger: '#c94f67',
        colorSuccess: '#4d9878',
        colorWarning: '#c98730',
        colorInfo: '#a16fbe',
        gradientPrimary: 'linear-gradient(135deg, #d66f9b 0%, #e6a14a 100%)',
        shadowCard: '0 12px 32px rgba(128, 67, 94, 0.11)',
        shadowFloating: '0 18px 46px rgba(133, 70, 99, 0.17)',
        radiusSmall: '10px',
        radiusMedium: '16px',
        radiusLarge: '24px',
      },
      dark: {
        colorPrimary: '#e69bbb',
        colorPrimaryHover: '#f0b3ca',
        colorPrimarySoft: '#512c3e',
        colorOnPrimary: '#32131f',
        colorAccent: '#efbe72',
        colorSurface: '#2a1d25',
        colorSurfaceRaised: '#35232d',
        colorSurfaceMuted: '#21171d',
        colorText: '#fff0f5',
        colorTextMuted: '#c3a3b2',
        colorBorder: '#543747',
        colorFocus: 'rgba(230, 155, 187, 0.30)',
        colorDanger: '#ef8297',
        colorSuccess: '#7bc6a5',
        colorWarning: '#e8b665',
        colorInfo: '#c89bdf',
        gradientPrimary: 'linear-gradient(135deg, #e69bbb 0%, #efbe72 100%)',
        shadowCard: '0 14px 36px rgba(0, 0, 0, 0.30)',
        shadowFloating: '0 20px 50px rgba(0, 0, 0, 0.40)',
        radiusSmall: '10px',
        radiusMedium: '16px',
        radiusLarge: '24px',
      },
    },
  },
};


function createCharacterPack({
  id,
  themeId,
  name,
  artwork,
  accent,
  accentDeep,
  accentSoft,
  artworkShape = 'tall',
  avatarPosition = 'center 20%',
}) {
  return {
    id,
    themeId,
    name,
    accent,
    accentDeep,
    accentSoft,
    assets: {
      buttonAvatar: artwork,
      cardCorner: artwork,
      emptyState: artwork,
      loading: artwork,
    },
    artworkShape,
    avatarPosition,
  };
}


export const characterPacks = {
  xiaoyun: createCharacterPack({
    id: 'xiaoyun',
    themeId: 'aurora',
    name: '小云',
    artwork: xiaoyunArtwork,
    accent: '#72b8dc',
    accentDeep: '#3e7fa7',
    accentSoft: '#e2f2fb',
    avatarPosition: 'center 22%',
  }),
  jiujiang: createCharacterPack({
    id: 'jiujiang',
    themeId: 'aurora',
    name: '九江',
    artwork: jiujiangArtwork,
    accent: '#7697bd',
    accentDeep: '#3f5f86',
    accentSoft: '#e7eef7',
    avatarPosition: 'center 18%',
  }),
  ningbo: createCharacterPack({
    id: 'ningbo',
    themeId: 'aurora',
    name: '宁波',
    artwork: ningboArtwork,
    accent: '#7d9ba3',
    accentDeep: '#48666f',
    accentSoft: '#e8f0f0',
    avatarPosition: 'center 19%',
  }),
  birthday: createCharacterPack({
    id: 'birthday',
    themeId: 'celebration',
    name: '生日',
    artwork: birthdayArtwork,
    accent: '#e294b4',
    accentDeep: '#a55577',
    accentSoft: '#fae4ee',
    artworkShape: 'square',
    avatarPosition: 'center center',
  }),
  beijing: createCharacterPack({
    id: 'beijing',
    themeId: 'celebration',
    name: '北京',
    artwork: beijingArtwork,
    accent: '#ed91b0',
    accentDeep: '#a84f72',
    accentSoft: '#fde8f0',
    avatarPosition: 'center 18%',
  }),
  chengdu: createCharacterPack({
    id: 'chengdu',
    themeId: 'celebration',
    name: '成都',
    artwork: chengduArtwork,
    accent: '#e7a142',
    accentDeep: '#99631f',
    accentSoft: '#fff0d5',
    avatarPosition: 'center 18%',
  }),
};


export const defaultThemeId = 'aurora';
export const defaultCharacterPackId = themePresets[defaultThemeId].defaultCharacterPack;


export function getThemePreset(themeId) {
  return themePresets[themeId] || themePresets[defaultThemeId];
}


export function getCharacterPack(packId) {
  return characterPacks[packId] || characterPacks[defaultCharacterPackId];
}


export function getThemeCharacters(themeId) {
  return getThemePreset(themeId).characterPackIds.map((packId) => getCharacterPack(packId));
}


export function tokenNameToCssVariable(tokenName) {
  return `--cui-${tokenName.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}`;
}


export function getTokenCssVariables(tokens) {
  return Object.fromEntries(
    Object.entries(tokens).map(([tokenName, tokenValue]) => [tokenNameToCssVariable(tokenName), tokenValue]),
  );
}


export function getCharacterCssVariables(characterPack) {
  return {
    '--cui-character-accent': characterPack.accent,
    '--cui-character-accent-deep': characterPack.accentDeep,
    '--cui-character-accent-soft': characterPack.accentSoft,
    '--cui-character-avatar-position': characterPack.avatarPosition,
  };
}
