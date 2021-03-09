import { Dimensions, Platform } from 'react-native';
export let allWeb = Platform.OS === 'web' ? true : false;
export let desktopWidth = 800;
export let desktopWeb = allWeb ? Dimensions.get('window').width >= desktopWidth ? true : false : false;
export let mobileWeb = allWeb ? Dimensions.get('window').width < desktopWidth ? true : false : false;
export let paddingTop = (Platform.OS === 'ios') ? 0 : 10;
export let width = desktopWeb ? 1180 : 'auto';
export let marginLeft = desktopWeb ? 'auto' : 10;
export let marginRight = desktopWeb ? 'auto' : 10;
export let paddingLeft = desktopWeb ? 40 : 0;
export let paddingRight = desktopWeb ? 40 : 0;
export let windowWidth = Dimensions.get('window').width;
export let windowHeight = Dimensions.get('window').height;

export let sidebarPaddingLeft = 845;
export let mainbarPaddingRight = desktopWeb ? 355 : 0;
export let imageWidth = desktopWeb ? 750 : Dimensions.get('window').width - 20;

export let exportDate = async (date: Date, days: number = 0) => {
    date.setDate(date.getDate() + days);
    return date.toLocaleDateString('fr-CA');
}