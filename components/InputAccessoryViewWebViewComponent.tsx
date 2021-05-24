import * as React from 'react';
import { View, Text, TouchableOpacity, TextInput, Keyboard, ScrollView } from 'react-native';

export function InputAccessoryViewWebViewComponent({ injectJavascript }: any) {
    const inputRef = React.useRef(null);
    return (
        <View style={{ backgroundColor: '#000000', height: 45, borderTopColor: '#444444', borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TextInput ref={inputRef} style={{ display: 'none' }} />
            <ScrollView horizontal={true} contentContainerStyle={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => {
                    injectJavascript(null, new Date().toLocaleTimeString('en-US', { hour12: true, hour: "numeric", minute: "numeric" }));
                }}><Text style={{ color: '#ffffff', fontSize: 18, padding: 10 }}>{`🕐`}</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => { injectJavascript(`bold`) }}><Text style={{ color: '#ffffff', fontSize: 18, padding: 10, fontWeight: 'bold' }}>B</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => { injectJavascript(`italic`) }}><Text style={{ color: '#ffffff', fontSize: 18, padding: 10, fontStyle: 'italic' }}>I</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => { injectJavascript(`underline`) }}><Text style={{ color: '#ffffff', fontSize: 18, padding: 10, textDecorationLine: 'underline' }}>U</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => { injectJavascript(`strikeThrough`) }}><Text style={{ color: '#ffffff', fontSize: 18, padding: 10, textDecorationLine: 'line-through' }}>S</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => { injectJavascript(`insertUnorderedList`) }}><Text style={{ color: '#ffffff', fontSize: 18, padding: 10 }}>{`≔`}</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => { injectJavascript(`outdent`) }}><Text style={{ color: '#ffffff', fontSize: 18, padding: 10 }}>{`←`}</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => { injectJavascript(`indent`) }}><Text style={{ color: '#ffffff', fontSize: 18, padding: 10 }}>{`→`}</Text></TouchableOpacity>
            </ScrollView>
            <TouchableOpacity
                onPress={() => { inputRef.current.focus(); Keyboard.dismiss(); }}
            ><Text style={{ color: '#ffffff', fontSize: 18, padding: 10 }}>Done</Text></TouchableOpacity>
        </View>
    );
}