import * as React from 'react';
import { InputAccessoryView, View, TouchableOpacity, Text, Keyboard, Platform } from 'react-native';
import { useTheme } from '@react-navigation/native';

export function InputAccessoryViewComponent({ enterTimestamp = null }) {
    const { colors } = useTheme();
    return (
        Platform.OS === 'ios' ?
            <InputAccessoryView nativeID='main'>
                <View style={{ backgroundColor: colors.background, height: 45, borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    {enterTimestamp ?
                        <TouchableOpacity onPress={() => { enterTimestamp(); }}><Text style={{ color: colors.text, fontSize: 18, padding: 10 }}>{`🕐`}</Text></TouchableOpacity> : <View />}
                    <TouchableOpacity
                        onPress={() => { Keyboard.dismiss(); }}
                    ><Text style={{ color: colors.text, fontSize: 18, padding: 10 }}>Done</Text></TouchableOpacity>
                </View>
            </InputAccessoryView> : <View />
    );
}