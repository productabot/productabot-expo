import * as React from 'react';
import { InputAccessoryView, View, TouchableOpacity, Text, Keyboard, Platform } from 'react-native';

export function InputAccessoryViewComponent({ enterTimestamp }) {
    return (
        Platform.OS === 'ios' ?
            <InputAccessoryView nativeID='main'>
                <View style={{ backgroundColor: '#000000', height: 45, borderTopColor: '#444444', borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    {enterTimestamp ?
                        <TouchableOpacity onPress={() => { enterTimestamp(); }}><Text style={{ color: '#ffffff', fontSize: 18, padding: 10 }}>{`🕐`}</Text></TouchableOpacity> : <View />}
                    <TouchableOpacity
                        onPress={() => { Keyboard.dismiss(); }}
                    ><Text style={{ color: '#ffffff', fontSize: 18, padding: 10 }}>Done</Text></TouchableOpacity>
                </View>
            </InputAccessoryView> : <View />
    );
}