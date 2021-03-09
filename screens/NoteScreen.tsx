import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, TextInput, Platform, ActionSheetIOS, KeyboardAvoidingView, Keyboard, Pressable } from 'react-native';
import { Text, View } from '../components/Themed';
import { API, graphqlOperation } from 'aws-amplify';
import { LoadingComponent } from '../components/LoadingComponent';
import * as root from '../Root';
import { useFocusEffect } from '@react-navigation/native';
import { InputAccessoryViewComponent } from '../components/InputAccessoryViewComponent';

export default function NoteScreen({ route, navigation }: any) {
    const [loading, setLoading] = useState(false);
    const [note, setNote] = useState({});
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
            notes_by_pk(id: "${route.params.id}") {
              id
              content
              title
            }
          }
          `));
        setNote(data.data.notes_by_pk);
        setLoading(false);
    }


    let enterTimestamp = async () => {
        let timestamp = new Date().toLocaleTimeString('en-US', {
            hour12: true,
            hour: "numeric",
            minute: "numeric"
        });
        setNote({ ...note, content: note.content + '\n\n' + timestamp + '\n' });
    }

    useEffect(() => {
        updateNote();
    }, [note]);


    let updateNote = async () => {
        if (update && note.id) {
            await API.graphql(graphqlOperation(`mutation($content: String, $title: String) {
                updateNote: update_notes_by_pk(pk_columns: {id: "${note.id}"}, _set: {content: $content, title: $title}) {id}
            }`, { content: note.content, title: note.title }));
        }
        else {
            setUpdate(true);
        }
    }

    return (
        <View style={styles.container}>
            {root.desktopWeb ?
                <View style={{ height: 50 }} />
                :
                <View style={{ padding: 10, paddingTop: 40, borderColor: '#444444', borderBottomWidth: 1, paddingBottom: 10, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <TouchableOpacity onPress={() => {
                        navigation.navigate('notes')
                    }}><Text style={{ fontSize: 30 }}>←</Text></TouchableOpacity>
                    <TextInput inputAccessoryViewID='main' style={{ color: '#ffffff', fontSize: 20 }} value={note.title} onChangeText={(value) => {
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
                style={{ width: '100%', height: root.windowHeight - 150 }}
            >
                <TextInput
                    autoFocus={true}
                    ref={inputRef}
                    //dataDetectorTypes={'all'}
                    editable={editable}
                    inputAccessoryViewID='main'
                    style={{ width: '100%', height: '100%', color: '#ffffff', padding: 10, fontSize: 16, paddingTop: 10, fontFamily: 'droid' }}
                    multiline={true}
                    value={note.content}
                    onChangeText={(value) => {
                        setUpdate(false);
                        setNote({ ...note, content: value });
                    }}
                    onBlur={async () => {
                        setUpdate(true);
                        setNote({ ...note });
                        setEditable(false);
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
