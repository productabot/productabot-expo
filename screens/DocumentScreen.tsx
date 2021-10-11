import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, TextInput, Platform, ActionSheetIOS, KeyboardAvoidingView, Keyboard, useWindowDimensions } from 'react-native';
import { Text, View } from '../components/Themed';
import { API, graphqlOperation } from 'aws-amplify';
import { LoadingComponent } from '../components/LoadingComponent';
import * as root from '../Root';
import { useFocusEffect } from '@react-navigation/native';
import { InputAccessoryViewComponent } from '../components/InputAccessoryViewComponent';
import CryptoJS from "react-native-crypto-js";
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DocumentScreen({ route, navigation, setLoading }: any) {
    const window = useWindowDimensions();
    const [document, setDocument] = useState({});
    const [update, setUpdate] = useState(true);
    const [editable, setEditable] = useState(Platform.OS === 'web' ? true : false);
    const [touch, setTouch] = useState({});
    const inputRef = useRef(null);

    useFocusEffect(
        React.useCallback(() => {
            if (!route.params) { route.params = {}; }
            onRefresh();
        }, [route.params])
    );

    let onRefresh = async () => {
        setLoading(true);
        let data = await API.graphql(graphqlOperation(`{
            documents_by_pk(id: "${route.params.id}") {
              id
              content
              title
            }
          }
          `));
        try {
            let e2eResult = await AsyncStorage.getItem('e2e');
            let decrypted = CryptoJS.AES.decrypt(data.data.documents_by_pk.content, e2eResult).toString(CryptoJS.enc.Utf8);
            data.data.documents_by_pk.content = decrypted;
        }
        catch (err) { console.log(err) }
        setDocument(data.data.documents_by_pk);
        setLoading(false);
    }


    let enterTimestamp = async () => {
        let timestamp = new Date().toLocaleTimeString('en-US', {
            hour12: true,
            hour: "numeric",
            minute: "numeric"
        });
        setDocument({ ...document, content: document.content + '\n\n' + timestamp + '\n' });
    }

    useEffect(() => {
        updateDocument();
    }, [document]);


    let updateDocument = async () => {
        if (update && document.id) {
            let e2eResult = await AsyncStorage.getItem('e2e');
            let encrypted = CryptoJS.AES.encrypt(document.content, e2eResult).toString();
            await API.graphql(graphqlOperation(`mutation($content: String, $title: String) {
                updateDocument: update_documents_by_pk(pk_columns: {id: "${document.id}"}, _set: {content: $content, title: $title}) {id}
            }`, { content: encrypted, title: document.title }));
        }
        else {
            setUpdate(true);
        }
    }

    return (
        <View style={styles.container}>
            <View style={{ padding: 10, paddingTop: root.desktopWeb ? 40 : 0, borderColor: '#444444', borderBottomWidth: root.desktopWeb ? 0 : 1, paddingBottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: root.desktopWeb ? Math.min(window.width, root.desktopWidth) : '100%' }}>
                <TouchableOpacity onPress={() => {
                    navigation.goBack()
                }}><Text style={{ fontSize: 30 }}>←</Text></TouchableOpacity>
                <TextInput spellCheck={false} inputAccessoryViewID='main' style={[{ color: '#ffffff', fontSize: 20, textAlign: 'center', width: '80%' }, root.desktopWeb && { outlineWidth: 0 }]} value={document.title} onChangeText={(value) => {
                    setUpdate(false);
                    setDocument({ ...document, title: value });
                }} onBlur={() => {
                    setUpdate(true);
                    setDocument({ ...document });
                }} />
                <TouchableOpacity onPress={async () => {
                    Platform.OS === 'ios' ?
                        ActionSheetIOS.showActionSheetWithOptions(
                            {
                                options: ['Cancel', 'Delete'],
                                cancelButtonIndex: 0,
                                destructiveButtonIndex: 1
                            },
                            buttonIndex => {
                                if (buttonIndex !== 0) {
                                    API.graphql(graphqlOperation(`mutation {
                                            delete_documents_by_pk(id: "${document.id}") {
                                                id
                                            }
                                        }`)).then((response) => {
                                        navigation.navigate('documents');
                                    });
                                }
                            }
                        )
                        :
                        API.graphql(graphqlOperation(`mutation {
                            delete_documents_by_pk(id: "${document.id}") {
                                id
                            }
                        }`)).then((response) => {
                            navigation.navigate('project');
                        });
                }}><Text style={{ fontSize: 30 }}>{Platform.OS === 'ios' ? '...' : '×'}</Text></TouchableOpacity>
            </View>
            <KeyboardAvoidingView
                onTouchStart={(event) => {
                    setTouch(event.nativeEvent);
                }}
                onTouchEnd={(event) => {
                    if (touch.locationY <= event.nativeEvent.locationY + 20 && touch.locationY >= event.nativeEvent.locationY - 20) {
                        setEditable(true);
                        setTimeout(() => { inputRef.current.focus(); }, 0);
                    }
                }}
                behavior={"height"}
                style={[{ width: root.desktopWeb ? Math.min(window.width, root.desktopWidth) : '100%', height: '100%', paddingBottom: 45 }]}
            >
                <TextInput
                    spellCheck={false}
                    // autoFocus={true}
                    ref={inputRef}
                    //dataDetectorTypes={'all'}
                    editable={editable}
                    inputAccessoryViewID='main'
                    style={[{ width: '100%', height: '100%', color: '#ffffff', padding: 10, fontSize: root.desktopWeb ? 12 : 16, paddingTop: 10, fontFamily: 'droid' }, root.desktopWeb && { outlineWidth: 0, borderColor: '#333333', borderWidth: 1, borderStyle: 'solid' }]}
                    multiline={true}
                    value={document.content}
                    onChangeText={(value) => {
                        setUpdate(false);
                        setDocument({ ...document, content: value });
                    }}
                    onBlur={async () => {
                        setUpdate(true);
                        setDocument({ ...document });
                        setEditable(root.desktopWeb ? true : false);
                    }}
                />
            </KeyboardAvoidingView>
            <InputAccessoryViewComponent enterTimestamp={enterTimestamp} />
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
