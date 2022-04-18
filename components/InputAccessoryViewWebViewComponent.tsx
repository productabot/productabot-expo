import * as React from 'react';
import { View, Text, TouchableOpacity, TextInput, Keyboard, ScrollView, ActionSheetIOS } from 'react-native';
import { useTheme } from '@react-navigation/native';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Storage } from "@aws-amplify/storage";
import { API, graphqlOperation } from "@aws-amplify/api";

export function InputAccessoryViewWebViewComponent({ injectJavascript, setLoading }: any) {
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
                <TouchableOpacity onPress={async () => {
                    let options = ['Cancel', 'Select from Camera Roll', 'Take Picture'];
                    ActionSheetIOS.showActionSheetWithOptions(
                        {
                            options: options,
                            cancelButtonIndex: 0
                        },
                        async (buttonIndex) => {
                            let selectedMedia;
                            if (buttonIndex === options.indexOf('Select from Camera Roll')) {
                                selectedMedia = await ImagePicker.launchImageLibraryAsync({
                                    mediaTypes: ImagePicker.MediaTypeOptions.All,
                                    allowsEditing: false,
                                    quality: 1,
                                    videoExportPreset: ImagePicker.VideoExportPreset.MediumQuality
                                });
                            }
                            else if (buttonIndex === options.indexOf('Take Picture')) {
                                await ImagePicker.requestCameraPermissionsAsync();
                                selectedMedia = await ImagePicker.launchCameraAsync({
                                    mediaTypes: ImagePicker.MediaTypeOptions.All,
                                    allowsEditing: false,
                                    quality: 1,
                                    videoExportPreset: ImagePicker.VideoExportPreset.MediumQuality
                                });
                            }
                            if (!selectedMedia.cancelled) {
                                setLoading(true);
                                let media = await ImageManipulator.manipulateAsync(selectedMedia.uri, [{ resize: { width: 350 } }], { compress: 1, format: ImageManipulator.SaveFormat.JPEG });
                                let response = await fetch(media.uri);
                                let blob = await response.blob();
                                let filename = `${uuidv4()}.jpg`;
                                await Storage.put(`${filename}`, blob, { contentType: blob.type, level: 'public' });
                                await API.graphql(graphqlOperation(`mutation {
                                    insert_files_one(object: {title: "${filename}", type: "${blob.type}", size: "${blob.size}"}) {id}
                                }`));
                                injectJavascript(`editor.chain().focus().setImage({ src: 'https://files.productabot.com/public/${filename}' }).run()`);
                                setLoading(false);
                            }
                        }
                    );

                }}><Text style={{ color: colors.text, fontSize: 18, padding: 10 }}>+ image</Text></TouchableOpacity>
            </ScrollView>
            <TouchableOpacity
                onPress={() => { inputRef.current.focus(); Keyboard.dismiss(); }}
            ><Text style={{ color: colors.text, fontSize: 18, padding: 10 }}>Done</Text></TouchableOpacity>
        </View>
    );
}