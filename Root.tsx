import { Platform } from 'react-native';
export let desktopWeb = Platform.OS === 'web';

export let exportDate = async (date: Date, days: number = 0) => {
    date.setDate(date.getDate() + days);
    return date.toLocaleDateString('fr-CA');
}