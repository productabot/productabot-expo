import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, TextInput, Platform, ActionSheetIOS, KeyboardAvoidingView, Keyboard, Pressable, useWindowDimensions } from 'react-native';
import { Text, View } from '../components/Themed';
import { API, graphqlOperation } from 'aws-amplify';
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
    const [loading, setLoading] = useState(false);
    const [note, setNote] = useState({});
    const [update, setUpdate] = useState(true);
    const [editable, setEditable] = useState(true);
    const [touch, setTouch] = useState({});
    const [keyboardOpen, setKeyboardOpen] = useState(false);
    const inputRef = useRef(null);

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
                data.notes_by_pk.content = CryptoJS.AES.decrypt(data.notes_by_pk.content, key).toString(CryptoJS.enc.Utf8).replace(/\n/g, "<br />").replace(/\n\n/g, "<p/>");
                setNote(data.notes_by_pk);
                inputRef.current.injectJavaScript(`(function() {
                    const div = document.querySelector('#editor');
                    div.innerHTML =  \`${data.notes_by_pk.content}\`;
                })();`);
            }
        });


    const injectJavascript = async (javascript: string, content = null) => {
        if (content) {
            setNote({ ...note, content: `${note.content}<p></p>${content}<br/><br/>` });
            inputRef.current.injectJavaScript(`(function() {
                const div = document.querySelector('#editor');
                div.innerHTML +=  \`<p></p>${content}<br/><br/>\`;
                document.execCommand('selectAll', false, null);
                document.getSelection().collapseToEnd();})();
            `);
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
        // clearTimeout(timeout); timeout = setTimeout(() => { updateNote() }, 5000);
        if (!keyboardOpen) {
            updateNote();
        }
        else {
            inputRef.current.injectJavaScript(`(function() {
                document.execCommand('selectAll', false, null);
                document.getSelection().collapseToEnd();})();
            `);
        }
    }, [keyboardOpen]);

    return (
        <View style={styles.container}>
            {root.desktopWeb ?
                <View style={{ height: 50 }} />
                :
                <View style={{ padding: 10, paddingTop: 40, borderColor: '#444444', borderBottomWidth: 1, paddingBottom: 10, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <TouchableOpacity onPress={() => {
                        navigation.navigate('notes')
                    }}><Text style={{ fontSize: 30 }}>←</Text></TouchableOpacity>
                    <TextInput spellCheck={false} style={{ color: '#ffffff', fontSize: 20 }} value={note.title} onChangeText={(value) => {
                        setUpdate(false);
                        setNote({ ...note, title: value });
                    }} onBlur={() => {
                        setUpdate(true);
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
                                            navigation.navigate('notes');
                                        });
                                    }
                                }
                            )
                    }}><Text style={{ fontSize: 30 }}>...</Text></TouchableOpacity>
                </View>}
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ width: '100%', height: window.height - 160 }}
            >
                {note.content &&
                    <WebView
                        ref={inputRef}
                        style={{ backgroundColor: '#000000' }}
                        containerStyle={{ backgroundColor: '#000000' }}
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
                                <body style="background-color:#000000;">
                                <div id="editor" contenteditable="true" style="outline:none;height:100%;font-family:droid;color:#ffffff;font-size:12"/>
                                </body>
                            `}}
                        keyboardDisplayRequiresUserAction={false}
                        showsHorizontalScrollIndicator={false}
                        style={{ flex: 1 }}
                        scalesPageToFit={false}
                        scrollEnabled={true}
                        javaScriptEnabled={true}
                        automaticallyAdjustContentInsets={false}
                        decelerationRate={0.998}
                        injectedJavaScript={`(function() {
                            window.document.querySelector("body").style.backgroundColor = "#000000";
                            window.addEventListener('load', function() {
                                document.querySelector('#editor').innerHTML =  \`${note.content}\`;
                                document.querySelector('#editor').addEventListener('input', (e) => {
                                    e.preventDefault();
                                    window.ReactNativeWebView.postMessage(e.target.innerHTML);
                                });
                            });
                        })();`}
                        onMessage={(e) => {
                            setNote({ ...note, content: e.nativeEvent.data });
                        }}
                        startInLoadingState={true}
                        renderLoading={() => <View style={{ height: '100%', width: '100%', backgroundColor: '#000000' }} />}
                    />}
                {keyboardOpen && <InputAccessoryViewWebViewComponent injectJavascript={injectJavascript} />}
            </KeyboardAvoidingView>
            {loading && <LoadingComponent />}
        </View >
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
