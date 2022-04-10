import * as React from 'react';
import { View, Text, TouchableOpacity, TextInput, Keyboard, ScrollView } from 'react-native';
import { useTheme } from '@react-navigation/native';

export function InputAccessoryViewWebViewComponent({ injectJavascript }: any) {
    const inputRef = React.useRef(null);
    const { colors } = useTheme();
    return (
        <View style={{ backgroundColor: colors.background, height: 45, borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TextInput placeholderTextColor={colors.placeholder} ref={inputRef} style={{ display: 'none' }} />
            <ScrollView horizontal={true} contentContainerStyle={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => {
                    injectJavascript(null, new Date().toLocaleTimeString('en-US', { hour12: true, hour: "numeric", minute: "numeric" }));
                }}><Text style={{ color: colors.text, fontSize: 18, padding: 10 }}>{`🕐`}</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => { injectJavascript(`editor.chain().focus().toggleBold().run()`) }}><Text style={{ color: colors.text, fontSize: 18, padding: 10, fontWeight: 'bold' }}>B</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => { injectJavascript(`editor.chain().focus().toggleItalic().run()`) }}><Text style={{ color: colors.text, fontSize: 18, padding: 10, fontStyle: 'italic' }}>I</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => { injectJavascript(`editor.chain().focus().toggleUnderline().run()`) }}><Text style={{ color: colors.text, fontSize: 18, padding: 10, textDecorationLine: 'underline' }}>U</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => { injectJavascript(`editor.chain().focus().toggleStrike().run()`) }}><Text style={{ color: colors.text, fontSize: 18, padding: 10, textDecorationLine: 'line-through' }}>S</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => { injectJavascript(`editor.chain().focus().toggleBulletList().run()`) }}><Text style={{ color: colors.text, fontSize: 18, padding: 10 }}>{`≔`}</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => { injectJavascript(`document.execCommand('outdent', false, null);`) }}><Text style={{ color: colors.text, fontSize: 18, padding: 10 }}>{`←`}</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => { injectJavascript(`document.execCommand('indent', false, null);`) }}><Text style={{ color: colors.text, fontSize: 18, padding: 10 }}>{`→`}</Text></TouchableOpacity>
            </ScrollView>
            <TouchableOpacity
                onPress={() => { inputRef.current.focus(); Keyboard.dismiss(); }}
            ><Text style={{ color: colors.text, fontSize: 18, padding: 10 }}>Done</Text></TouchableOpacity>
        </View>
    );
}