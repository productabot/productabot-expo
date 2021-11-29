import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, TextInput, Platform, ActionSheetIOS, KeyboardAvoidingView, Keyboard, Pressable, useWindowDimensions, Animated } from 'react-native';
import { Text, View } from '../components/Themed';
import { API, graphqlOperation } from "@aws-amplify/api";
import { LoadingComponent } from '../components/LoadingComponent';
import * as root from '../Root';
import { InputAccessoryViewWebViewComponent } from '../components/InputAccessoryViewWebViewComponent';
import CryptoJS from "react-native-crypto-js";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import sanitizeHtml from "sanitize-html";
import { DroidWebViewStyle } from '../assets/fonts/DroidWebViewStyle';
import { useMutation, useSubscription, gql } from "@apollo/client";
let timeout: any;


export default function NoteScreen({ route, navigation, refresh }: any) {
    const window = useWindowDimensions();
    const [key, setKey] = useState('');
    const [note, setNote] = useState({});
    const [keyboardOpen, setKeyboardOpen] = useState(false);
    const inputRef = useRef(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener('keyboardWillShow', () => { setKeyboardOpen(true); });
        const keyboardDidHideListener = Keyboard.addListener('keyboardWillHide', () => { setKeyboardOpen(false); });
        const async = async () => {
            let e2eResult = await AsyncStorage.getItem('e2e');
            setKey(e2eResult);
        }
        async();
        return () => {
            keyboardDidHideListener.remove();
            keyboardDidShowListener.remove();
        };
    }, []);

    const firstLoad = () => {
        let noteExists = note.content ? true : false;
        timeout = setTimeout(() => {
            if (noteExists) {
                firstLoad();
            }
            else {
                clearTimeout(timeout);
                inputRef.current.injectJavaScript(`(function() {
                    document.querySelector('#editor').focus();
                    document.execCommand('selectAll', false, null);
                    document.getSelection().collapseToEnd();
                })();`);
                Animated.timing(fadeAnim, { toValue: 1, duration: 50, useNativeDriver: false }).start();
            }
        }, 1000);
    }

    useSubscription(
        gql`subscription ($id: uuid!) {
            notes_by_pk(id: $id) {
                id
                title
                content
            }
        }`,
        {
            variables: { id: route.params.id },
            onSubscriptionData: async ({ subscriptionData: { data, error, loading } }) => {
                if (!note.content) {
                    firstLoad();
                }
                data.notes_by_pk.content = CryptoJS.AES.decrypt(data.notes_by_pk.content, key).toString(CryptoJS.enc.Utf8).replace(/\n/g, "<br />").replace(/\n\n/g, "<p/>");
                setNote(data.notes_by_pk);
                inputRef.current.injectJavaScript(`(function() {
                    document.querySelector('#editor').innerHTML =  \`${data.notes_by_pk.content}\`;
                })();`);
            }
        });


    const injectJavascript = async (javascript: string, content = null) => {
        if (content) {
            setNote({ ...note, content: `${note.content}<p></p>${content}<br/><br/>` });
            inputRef.current.injectJavaScript(`(function() {
                document.querySelector('#editor').innerHTML +=  \`<div><br/></div><div>${content}</div><div><br/></div>\`;
                document.execCommand('selectAll', false, null);
                document.getSelection().collapseToEnd();
            })();`);
        }
        else {
            inputRef.current.injectJavaScript(`(function() {
                document.execCommand('${javascript}', false, '');
                window.ReactNativeWebView.postMessage(document.querySelector('#editor').innerHTML);
            })();`);
        }
    }

    let updateNote = async () => {
        if (note.title) {
            let e2eResult = await AsyncStorage.getItem('e2e');
            let encrypted = CryptoJS.AES.encrypt(note.content, e2eResult).toString();
            await API.graphql(graphqlOperation(`mutation($content: String, $title: String) {
            updateNote: update_notes_by_pk(pk_columns: {id: "${note.id}"}, _set: {content: $content, title: $title}) {id}
        }`, { content: encrypted, title: note.title }));
        }
    }

    useEffect(() => {
        if (!keyboardOpen) {
            updateNote();
        }
        else {
            inputRef.current.injectJavaScript(`(function() {
                    document.execCommand('selectAll', false, null);
                    document.getSelection().collapseToEnd();
                    setTimeout(()=>{document.querySelector('#editor').scrollIntoView({ behavior: "smooth", block: "end" });},50);
                })();`);
        }
    }, [keyboardOpen]);

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            {
                <View style={{ padding: 10, paddingTop: 0, borderColor: '#444444', borderBottomWidth: 1, paddingBottom: 10, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <TouchableOpacity onPress={() => {
                        navigation.navigate('notesTab')
                    }}><Text style={{ fontSize: 30 }}>←</Text></TouchableOpacity>
                    <TextInput spellCheck={false} style={{ color: '#ffffff', fontSize: 20 }} value={note.title} onChangeText={(value) => {
                        setNote({ ...note, title: value });
                    }} onBlur={() => {
                        setNote({ ...note });
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
                                            delete_notes_by_pk(id: "${note.id}") {
                                                id
                                            }
                                        }`)).then((response) => {
                                            navigation.navigate('notesTab');
                                        });
                                    }
                                }
                            )
                    }}><Text style={{ fontSize: 30 }}>...</Text></TouchableOpacity>
                </View>
            }
            <KeyboardAvoidingView
                behavior={"height"}
                style={{ width: '100%', height: '100%', paddingBottom: 45 }}
            >
                <WebView
                    style={{ backgroundColor: 'transparent', flex: 0, height: '100%' }}
                    ref={inputRef}
                    hideKeyboardAccessoryView={true}
                    inputAccessoryViewID='main'
                    originWhitelist={['*']}
                    source={{
                        baseUrl: '',
                        html: `
                                <head>
                                <meta name="viewport" content="width=device-width; initial-scale=1.0; maximum-scale=1.0; user-scalable=no;" />
                                <style>
                                ${DroidWebViewStyle}
                                </style>
                                </head>
                                <body>
                                <div id="editor" contenteditable="true" style="outline:none;font-family:droid;color:#ffffff;font-size:12;"/>
                                </body>
                            `}}
                    keyboardDisplayRequiresUserAction={false}
                    showsHorizontalScrollIndicator={false}
                    scalesPageToFit={false}
                    scrollEnabled={true}
                    javaScriptEnabled={true}
                    automaticallyAdjustContentInsets={true}
                    decelerationRate={0.998}
                    injectedJavaScript={`(function() {
                            window.addEventListener('load', function() {
                                document.querySelector('#editor').addEventListener('input', (e) => {
                                    e.preventDefault();
                                    window.ReactNativeWebView.postMessage(e.target.innerHTML);
                                });
                            });
                        })();`}
                    onMessage={(e) => {
                        setNote({ ...note, content: e.nativeEvent.data });
                    }}
                />
                {keyboardOpen && <InputAccessoryViewWebViewComponent injectJavascript={injectJavascript} />}
            </KeyboardAvoidingView >
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
        alignItems: 'center',
        justifyContent: 'flex-start'
    }
});
