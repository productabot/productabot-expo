import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, TextInput, Platform, ActionSheetIOS, KeyboardAvoidingView, Keyboard, Pressable } from 'react-native';
import { Text, View } from '../components/Themed';
import { API, graphqlOperation } from 'aws-amplify';
import { LoadingComponent } from '../components/LoadingComponent';
import * as root from '../Root';
import { useFocusEffect } from '@react-navigation/native';
import { InputAccessoryViewComponent } from '../components/InputAccessoryViewComponent';

export default function DocumentScreen({ route, navigation }: any) {
    const [loading, setLoading] = useState(false);
    const [document, setDocument] = useState({});
    const [update, setUpdate] = useState(true);
    const [editable, setEditable] = useState(true);
    const [touch, setTouch] = useState({});
    const inputRef = useRef(null);

    useFocusEffect(
        React.useCallback(() => {
            if (!route.params) { route.params = {}; }
            onRefresh();
        }, [])
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
            await API.graphql(graphqlOperation(`mutation($content: String, $title: String) {
                updateDocument: update_documents_by_pk(pk_columns: {id: "${document.id}"}, _set: {content: $content, title: $title}) {id}
            }`, { content: document.content, title: document.title }));
        }
        else {
            setUpdate(true);
        }
    }

    return (
        <View style={styles.container}>
            <View style={{ padding: 10, paddingTop: 40, borderColor: '#444444', borderBottomWidth: 1, paddingBottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: root.desktopWeb ? root.desktopWidth : '100%' }}>
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
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={[{ width: root.desktopWeb ? root.desktopWidth : '100%', height: root.windowHeight - 150 }]}
            >
                <TextInput spellCheck={false}
                    autoFocus={true}
                    ref={inputRef}
                    //dataDetectorTypes={'all'}
                    editable={editable}
                    inputAccessoryViewID='main'
                    style={[{ width: '100%', height: '100%', color: '#ffffff', padding: 10, fontSize: root.desktopWeb ? 12 : 16, paddingTop: 10, fontFamily: 'droid' }, root.desktopWeb && { outlineWidth: 0 }]}
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
            { loading && <LoadingComponent />}
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
