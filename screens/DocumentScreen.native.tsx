import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, TextInput, Platform, ActionSheetIOS, KeyboardAvoidingView, Keyboard, Pressable, useWindowDimensions, Animated } from 'react-native';
import { Text, View } from '../components/Themed';
import { API, graphqlOperation } from "@aws-amplify/api";
import { InputAccessoryViewWebViewComponent } from '../components/InputAccessoryViewWebViewComponent';
import CryptoJS from "react-native-crypto-js";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@react-navigation/native';

export default function DocumentScreen({ route, navigation, setLoading, refresh }: any) {
    const window = useWindowDimensions();
    const [file, setFile] = useState({});
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const inputRef = useRef(null);
    const { colors } = useTheme();

    useFocusEffect(
        React.useCallback(() => {
            if (!route.params) { route.params = {}; }
            const keyboardWillShowListener = Keyboard.addListener('keyboardWillShow', (e) => { setKeyboardHeight(e.endCoordinates.height); });
            const keyboardWillHideListener = Keyboard.addListener('keyboardWillHide', () => { setKeyboardHeight(0); });
            return () => {
                keyboardWillHideListener.remove();
                keyboardWillShowListener.remove();
            };
        }, [route.params])
    );

    React.useEffect(() => {
        setLoading(true);
    }, []);

    const onRefresh = async () => {
        setLoading(true);
        let data = (await API.graphql(graphqlOperation(`{
            files_by_pk(id: "${route.params.id}") {
                id
                title
                content
            }
        }`))).data;
        let e2eResult = await AsyncStorage.getItem('e2e');
        data.files_by_pk.content = CryptoJS.AES.decrypt(data.files_by_pk.content, e2eResult).toString(CryptoJS.enc.Utf8).replace(/\n/g, "<br />").replace(/\n\n/g, "<p/>");
        setFile(data.files_by_pk);
        inputRef.current.injectJavaScript(`(function() {
            const { from, to } = editor.state.selection;
            editor.commands.setContent(\`${data.files_by_pk.content.replace(/<div><br><\/div>/g, '<p></p>').replace(/<div>/g, '<p>').replace(/<\/div>/g, '</p>')}\`);
            editor.commands.setTextSelection({ from, to });
        })();`);
        setLoading(false);
    }

    const injectJavascript = async (javascript: string, content = null) => {
        if (content) {
            setFile({ ...file, content: `${file.content}<p></p>${content}<br/><br/>` });
            inputRef.current.injectJavaScript(`(function() {
                editor.chain().focus().insertContent(\`${content}\`).run()
            })();`);
        }
        else {
            inputRef.current.injectJavaScript(`(function() {
                ${javascript}
            })();`);
        }
    }

    let updateFile = async () => {
        if (file.title) {
            let e2eResult = await AsyncStorage.getItem('e2e');
            let encrypted = CryptoJS.AES.encrypt(file.content, e2eResult).toString();
            await API.graphql(graphqlOperation(`mutation($content: String, $title: String) {
                updateFile: update_files_by_pk(pk_columns: {id: "${file.id}"}, _set: {content: $content, title: $title}) {id}
            }`, { content: encrypted, title: file.title }));
        }
    }

    useEffect(() => {
        if (!keyboardHeight) {
            updateFile();
        }
    }, [keyboardHeight]);

    return (
        <View style={{
            flex: 1,
            backgroundColor: colors.background,
            alignItems: 'center',
            justifyContent: 'flex-start'
        }}>
            {
                <View style={{ padding: 10, paddingTop: 0, borderColor: '#444444', borderBottomWidth: 1, paddingBottom: 10, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <TouchableOpacity onPress={() => {
                        navigation.goBack();
                    }}><Text style={{ fontSize: 30 }}>←</Text></TouchableOpacity>
                    <TextInput placeholderTextColor={colors.placeholder} spellCheck={false} style={{ color: colors.text, fontSize: 20 }} value={file.title} onChangeText={(value) => {
                        setFile({ ...file, title: value });
                    }} onBlur={() => {
                        setFile({ ...file });
                    }} />
                    <TouchableOpacity onPress={async () => {
                        Platform.OS === 'ios' &&
                            ActionSheetIOS.showActionSheetWithOptions(
                                {
                                    options: ['Cancel', 'Delete'],
                                    cancelButtonIndex: 0,
                                    destructiveButtonIndex: 1
                                },
                                buttonIndex => {
                                    if (buttonIndex !== 0) {
                                        API.graphql(graphqlOperation(`mutation {
                                            delete_files_by_pk(id: "${file.id}") {
                                                id
                                            }
                                        }`)).then((response) => {
                                            navigation.goBack();
                                        });
                                    }
                                }
                            )
                    }}><Text style={{ fontSize: 30 }}>...</Text></TouchableOpacity>
                </View>
            }
            <View style={{ width: '100%', height: keyboardHeight ? (window.height - keyboardHeight - 45) : '100%', paddingBottom: 45 }}>
                <WebView
                    style={{ backgroundColor: 'transparent' }}
                    ref={inputRef}
                    hideKeyboardAccessoryView={true}
                    inputAccessoryViewID='main'
                    originWhitelist={['*']}
                    source={{
                        baseUrl: '',
                        html: `
                        <!DOCTYPE html>
                        <html>
                        <head>
                          <meta charset="utf-8">
                          <meta name="viewport" content="width=device-width; initial-scale=1.0; maximum-scale=1.0; user-scalable=no;" />
                          <style>
                          .ProseMirror {
                            outline:none;font-family:Menlo, monospace;color:${colors.text};font-size:13px;height: 100vh;
                          }
                          .ProseMirror p {
                            margin: 0px;
                        }
                        
                        .ProseMirror:hover {
                            text-decoration-line: none !important;
                        }
                        
                        code {
                            border: 1px solid white;
                            padding: 10px;
                            margin: 10px;
                            display: block;
                            border-radius: 5px;
                        }
                          </style>
                        </head>
                        <body>
                          <div id="editor"></div>
                          <script type="module">
                            import { Editor } from 'https://cdn.skypack.dev/@tiptap/core@2.0.0-beta.176?min'
                            import StarterKit from 'https://cdn.skypack.dev/@tiptap/starter-kit@2.0.0-beta.185?min'
                            import Image from 'https://cdn.skypack.dev/@tiptap/extension-image@2.0.0-beta.27?min'
                            import Typography from 'https://cdn.skypack.dev/@tiptap/extension-typography@2.0.0-beta.20?min';
                            import TextAlign from 'https://cdn.skypack.dev/@tiptap/extension-text-align@2.0.0-beta.29?min';
                            import Link from 'https://cdn.skypack.dev/@tiptap/extension-link@2.0.0-beta.38?min';
                            window.editor = new Editor({
                              element: document.querySelector('#editor'),
                              extensions: [
                                StarterKit.configure({ dropcursor: true }),
                                Image.configure({inline: true }),
                                TextAlign,
                                Typography.configure({
                                    openDoubleQuote: false,
                                    closeDoubleQuote: false,
                                    openSingleQuote: false,
                                    closeSingleQuote: false,
                                    oneHalf: false,
                                    oneQuarter: false,
                                    threeQuarters: false,
                                    plusMinus: false,
                                    laquo: false,
                                    raquo: false,
                                    multiplication: false,
                                    ellipsis: false
                                }),
                                Link
                              ],
                              content: '',
                              onUpdate: async ({ editor }) => {
                                  const html = editor.getHTML();
                                  window.ReactNativeWebView.postMessage(html);
                              },
                            })
                            window.addEventListener('load', function() {
                                document.addEventListener("keypress", function(e) {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        window.editor.chain().focus().setHardBreak().run()
                                    }
                                });
                            });
                          </script>
                        </body>
                        </html>
                            `}}
                    keyboardDisplayRequiresUserAction={false}
                    showsHorizontalScrollIndicator={false}
                    scalesPageToFit={false}
                    scrollEnabled={true}
                    javaScriptEnabled={true}
                    automaticallyAdjustContentInsets={true}
                    decelerationRate={0.998}
                    injectedJavaScript={`(function() {
                    })();`}
                    onMessage={(e) => {
                        setFile({ ...file, content: e.nativeEvent.data });
                    }}
                    onLoad={async () => { onRefresh(); }}
                />
                {keyboardHeight !== 0 && <InputAccessoryViewWebViewComponent injectJavascript={injectJavascript} setLoading={setLoading} />}
            </View >
        </View>
    );
}