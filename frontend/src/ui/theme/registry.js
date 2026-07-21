import xiaoyunArtwork from '../assets/characters/xiaoyun.png';
import birthdayArtwork from '../assets/characters/birthday.png';


export const themePresets = {
  aurora: {
    id: 'aurora',
    name: '极光蓝',
    description: '清透、轻盈，适合默认产品界面。',
    defaultCharacterPack: 'xiaoyun',
    tokens: {
      light: {
        colorPrimary: '#3f8fba',
        colorPrimaryHover: '#2f7da8',
        colorPrimarySoft: '#e9f5fb',
        colorOnPrimary: '#ffffff',
        colorSurface: '#ffffff',
        colorSurfaceRaised: '#ffffff',
        colorSurfaceMuted: '#f4f7fb',
        colorText: '#1f2d43',
        colorTextMuted: '#738198',
        colorBorder: '#dfe5ee',
        colorFocus: 'rgba(63, 143, 186, 0.25)',
        colorDanger: '#d75d73',
        colorSuccess: '#3c9b75',
        shadowCard: '0 12px 32px rgba(50, 76, 108, 0.10)',
      },
      dark: {
        colorPrimary: '#75b9dc',
        colorPrimaryHover: '#91cae5',
        colorPrimarySoft: '#183c52',
        colorOnPrimary: '#102331',
        colorSurface: '#172234',
        colorSurfaceRaised: '#1e2b40',
        colorSurfaceMuted: '#111a29',
        colorText: '#ecf3fb',
        colorTextMuted: '#9dabc0',
        colorBorder: '#334158',
        colorFocus: 'rgba(117, 185, 220, 0.30)',
        colorDanger: '#ef8193',
        colorSuccess: '#71c9a5',
        shadowCard: '0 14px 36px rgba(0, 0, 0, 0.28)',
      },
    },
  },
  celebration: {
    id: 'celebration',
    name: '生日庆典',
    description: '温暖、甜美，适合生日和纪念日活动。',
    defaultCharacterPack: 'birthday',
    tokens: {
      light: {
        colorPrimary: '#c96f95',
        colorPrimaryHover: '#b85d84',
        colorPrimarySoft: '#fbeaf1',
        colorOnPrimary: '#ffffff',
        colorSurface: '#fffdfd',
        colorSurfaceRaised: '#ffffff',
        colorSurfaceMuted: '#fbf5f8',
        colorText: '#3f2935',
        colorTextMuted: '#8b7180',
        colorBorder: '#eadde4',
        colorFocus: 'rgba(201, 111, 149, 0.25)',
        colorDanger: '#c94f67',
        colorSuccess: '#4c9a78',
        shadowCard: '0 12px 32px rgba(128, 67, 94, 0.11)',
      },
      dark: {
        colorPrimary: '#e49ab8',
        colorPrimaryHover: '#efb2c9',
        colorPrimarySoft: '#512c3e',
        colorOnPrimary: '#32131f',
        colorSurface: '#2a1d25',
        colorSurfaceRaised: '#35232d',
        colorSurfaceMuted: '#21171d',
        colorText: '#fff0f5',
        colorTextMuted: '#c3a3b2',
        colorBorder: '#543747',
        colorFocus: 'rgba(228, 154, 184, 0.30)',
        colorDanger: '#ef8297',
        colorSuccess: '#7bc6a5',
        shadowCard: '0 14px 36px rgba(0, 0, 0, 0.30)',
      },
    },
  },
};


export const characterPacks = {
  xiaoyun: {
    id: 'xiaoyun',
    name: '小云公主',
    description: '蓝色礼服与气泡元素，适合清新、梦幻主题。',
    accent: '#72b8dc',
    accentDeep: '#3e7fa7',
    accentSoft: '#e2f2fb',
    assets: {
      buttonAvatar: xiaoyunArtwork,
      cardCorner: xiaoyunArtwork,
      emptyState: xiaoyunArtwork,
      loading: xiaoyunArtwork,
    },
    artworkShape: 'tall',
  },
  birthday: {
    id: 'birthday',
    name: '生日女孩',
    description: '粉色礼服与秋千元素，适合生日、礼物主题。',
    accent: '#e294b4',
    accentDeep: '#a55577',
    accentSoft: '#fae4ee',
    assets: {
      buttonAvatar: birthdayArtwork,
      cardCorner: birthdayArtwork,
      emptyState: birthdayArtwork,
      loading: birthdayArtwork,
    },
    artworkShape: 'square',
  },
};


export const defaultThemeId = 'aurora';
export const defaultCharacterPackId = themePresets[defaultThemeId].defaultCharacterPack;


export function getThemePreset(themeId) {
  return themePresets[themeId] || themePresets[defaultThemeId];
}


export function getCharacterPack(packId) {
  return characterPacks[packId] || characterPacks[defaultCharacterPackId];
}
