import React, { useState, useEffect, useRef, useReducer } from 'react';
import { StyleSheet, TouchableOpacity, TextInput, RefreshControl, useWindowDimensions } from 'react-native';
import { Text, View } from '../components/Themed';
import { API, graphqlOperation } from 'aws-amplify';
import { LoadingComponent } from '../components/LoadingComponent';
import * as root from '../Root';
import { useFocusEffect } from '@react-navigation/native';
import DraggableFlatList from 'react-native-draggable-flatlist';
import RNPickerSelect from 'react-native-picker-select';
import { useMutation, useSubscription, gql } from "@apollo/client";
import CryptoJS from "react-native-crypto-js";
import AsyncStorage from '@react-native-async-storage/async-storage';
import ContentEditable from 'react-contenteditable';
import sanitizeHtml from "sanitize-html";
import CaretPositioning from './EditCaretPositioning'
import { CustomDraggableFlatList } from '../components/CustomDraggableFlatList';
import SplitPane, { Pane } from 'react-split-pane';

let timeout: any;
let timeout2: any;
let caret = { start: 0, end: 0 };

export default function NotesScreen({ route, navigation, refresh }: any) {
    const windowDimensions = useWindowDimensions();
    const [key, setKey] = useState('');
    const [loading, setLoading] = useState(true);
    const [tags, setTags] = useState([]);
    const [tag, setTag] = useState({});
    const [notes, setNotes] = useState([]);
    const [tagId, setTagId] = useState('');
    const [search, setSearch] = useState('');
    const inputRef = useRef(null);
    const [hidePane, setHidePane] = useState(false);
    const [paneSize, setPaneSize] = useState(1000);

    const [noteId, setNoteId] = useState('');
    const [noteContent, setNoteContent] = useState('');
    const [noteTitle, setNoteTitle] = useState('');

    useEffect(() => {
        const async = async () => {
            let e2eResult = await AsyncStorage.getItem('e2e');
            setKey(e2eResult);
        }
        async();
    }, []);

    useSubscription(
        gql`subscription {
            tags(order_by: {order: asc}) {
              id
              title
              order
              notes(order_by: {order: desc}) {
                id
                title
              }
            }
          }`,
        {
            onSubscriptionData: async ({ subscriptionData: { data, error, loading } }) => {
                setLoading(loading);
                setTags(data.tags);
                setTag(tagId.length > 0 ? data.tags.filter(obj => obj.id === tagId)[0] : data.tags[0]);
                setNotes(tagId.length > 0 ? data.tags.filter(obj => obj.id === tagId)[0].notes : data.tags[0].notes)
                !noteId && setNoteId(data.tags[0].notes[0].id)
            }
        });

    useSubscription(
        gql`subscription ($id: uuid!) {
            notes_by_pk(id: $id) {
                id
                title
                content
            }
        }`,
        {
            variables: { id: noteId },
            onSubscriptionData: async ({ subscriptionData: { data, error, loading } }) => {
                setLoading(false);
                try {
                    data.notes_by_pk.content = CryptoJS.AES.decrypt(data.notes_by_pk.content, key).toString(CryptoJS.enc.Utf8).replace(/\n/g, "<br />").replace(/\n\n/g, "<p/>");
                }
                catch (err) {
                    console.log(err);
                }
                setNoteTitle(data.notes_by_pk.title);
                setNoteContent(data.notes_by_pk.content);
                if (!caret.start) {
                    document.execCommand('selectAll', false, null);
                    document.getSelection().collapseToEnd();
                    try {
                        caret = CaretPositioning.saveSelection(inputRef.current);
                    }
                    catch (err) { console.log(err); }
                }
                else if (document.activeElement === inputRef.current) {
                    CaretPositioning.restoreSelection(inputRef.current, caret);
                }
            }
        });

    useEffect(() => {
        setLoading(true);
    }, [noteId]);


    const updateNotes = async () => {
        if (notes.length > 0) {
            await API.graphql(graphqlOperation(`mutation {
            ${notes.map((note, noteIndex) => `notes${noteIndex}: update_notes_by_pk(pk_columns: {id: "${note.id}"}, _set: {order: ${(notes.length - 1) - noteIndex}}) {id}`)}
        }`));
        }
    }

    useEffect(() => {
        const updateTag = async () => {
            if (tag.title) {
                await API.graphql(graphqlOperation(`mutation($title: String) {
                    ${tag.id ? `updateTag: update_tags_by_pk(pk_columns: {id: "${tag.id}"}, _set: {title: $title}) {id}` : ``}
                }`, { title: tag.title }));
            }
        }
        updateTag();
    }, [tag]);

    useEffect(() => {
        const updateTags = async () => {
            if (tags.length > 0) {
                await API.graphql(graphqlOperation(`mutation {
                    ${tags.map((tag, tagIndex) => `tags${tagIndex}: update_tags_by_pk(pk_columns: {id: "${tag.id}"}, _set: {order: ${tagIndex}, title: "${tag.title}"}) {id}`)}
                }`));
            }
        }
        updateTags();
    }, [tags]);

    const saveNoteContentImmediately = async () => {
        try {
            caret = CaretPositioning.saveSelection(inputRef.current);
        }
        catch (err) { console.log(err); }
        setNoteContent(inputRef.current.innerHTML);
        try {
            await API.graphql(graphqlOperation(`mutation($content: String) {
        updateNote: update_notes_by_pk(pk_columns: {id: "${noteId}"}, _set: {content: $content}) {id}
    }`, { content: CryptoJS.AES.encrypt(inputRef.current.innerHTML, key).toString() }));
        }
        catch (err) {
            console.log(err);
        }
    }

    const saveNoteContent = async () => {
        clearTimeout(timeout);
        timeout = setTimeout(async () => {
            saveNoteContentImmediately();
        }, 5000);
    }

    const saveNoteTitleImmediately = async (value) => {
        await API.graphql(graphqlOperation(`mutation($title: String) {
            updateNote: update_notes_by_pk(pk_columns: {id: "${noteId}"}, _set: {title: $title}) {id}
        }`, { title: value ? value : noteTitle }));
    }

    useEffect(() => {
        const updateNoteTitle = async () => {
            clearTimeout(timeout2);
            timeout2 = setTimeout(async () => {
                saveNoteTitleImmediately();
            }, 5000);
        }
        updateNoteTitle();
    }, [noteTitle]);

    return (
        <View style={styles.container}>
            <View style={{ height: 50 }} />
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', width: Math.min(windowDimensions.width, root.desktopWidth) + 2, height: windowDimensions.height - 49, maxWidth: Math.min(windowDimensions.width, root.desktopWidth) + 2 }}>
                <SplitPane split="vertical" pane1Style={hidePane && { display: 'none' }} defaultSize={'26%'} resizerStyle={{ width: 4, backgroundColor: '#444444', cursor: 'col-resize' }} onResizerDoubleClick={(e) => { setHidePane(!hidePane) }} onChange={(size) => { setPaneSize(size) }} >
                    <View style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', width: `100%`, borderWidth: 1, borderColor: '#444444', borderStyle: 'solid', borderRightWidth: 0 }}>
                        <View style={{ height: 49, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', width: '100%' }}>
                            <TextInput spellCheck={false} placeholder="search" style={{ backgroundColor: '#000000', color: '#ffffff', borderColor: '#444444', borderWidth: 1, padding: 5, borderRadius: 5, width: '100%', outlineWidth: 0, marginLeft: 10 }}
                                value={search || ''}
                                onChangeText={(value) => { setSearch(value); }}
                            />
                            <TouchableOpacity
                                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                                onPress={async () => {
                                    let dateString = new Date().toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
                                    await API.graphql(graphqlOperation(`mutation {
                                insert_notes_one(object: {tag_id: "${tag.id}", title: "${dateString}", content: "", order: ${notes.length}}) {
                                  id
                                }
                              }`));
                                }} style={{ width: 40 }}><Text style={{ textAlign: 'center' }}>+</Text></TouchableOpacity>
                        </View>
                        <View style={{ flexDirection: 'row', width: '100%', height: '100%', marginBottom: -49, borderTopColor: '#444444', borderTopWidth: 1, borderStyle: 'solid', flexGrow: 1 }}>
                            {paneSize >= 220 &&
                                <View style={{ maxWidth: 260 }}>
                                    <CustomDraggableFlatList
                                        renderItemStyle={{ marginLeft: 5, marginRight: 5, paddingLeft: 7.5, paddingRight: 7.5 }}
                                        noBorder={true}
                                        data={tags}
                                        renderItem={(item) => {
                                            return (
                                                <View
                                                    onLongPress={async () => {
                                                        let title = prompt('Change Tag');
                                                        if (title.length === 0) {
                                                            let result = confirm('Are you sure you want to delete this tag?');
                                                            if (result) {
                                                                await API.graphql(graphqlOperation(`mutation {delete_tags_by_pk(id: "${item.item.id}") {id}}`));
                                                            }
                                                        }
                                                        else {
                                                            setTag({ ...tag, title: title });
                                                        }
                                                    }}
                                                    style={{ flexDirection: 'row', width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    {(tag) && <Text numberOfLines={1} style={[tag.id === item.item.id && { fontWeight: 'bold' }]}>📁 {item.item.title}</Text>}
                                                </View>
                                            )
                                        }}
                                        onPress={(item) => {
                                            setTag(item.item);
                                            setTagId(item.item.id);
                                            setNotes(tags.filter(obj => obj.id === item.item.id)[0].notes);
                                            updateNotes();
                                        }}
                                        onDragEnd={({ data }) => {
                                            setTags(data);
                                        }}
                                        ListFooterComponent={() => (
                                            <TouchableOpacity
                                                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10 }}
                                                onPress={async () => {
                                                    let title = prompt('Tag title?');
                                                    let data = await API.graphql(graphqlOperation(`mutation {
                                                insert_tags_one(object: {title: "${title}", order: ${tags.length}}) {
                                                id
                                                }
                                            }`));
                                                    let newTags = tags;
                                                    newTags.push({ id: data.data.insert_tags_one.id, title: title });
                                                    setTags(newTags);
                                                    setTag(newTags[newTags.length - 1]);
                                                }}><Text numberOfLines={1} style={{ textAlign: 'center', color: '#aaaaaa' }}>add new tag +</Text>
                                            </TouchableOpacity>
                                        )}
                                    /></View>}
                            <CustomDraggableFlatList
                                renderItemStyle={{ marginLeft: 5, marginRight: 5, paddingLeft: 7.5, paddingRight: 7.5 }}
                                noBorder={true}
                                data={notes}
                                renderItem={(item) => {
                                    return (
                                        <View
                                            style={{ flexDirection: 'column', width: '100%', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                            <Text numberOfLines={1} style={[noteId === item.item.id && { fontWeight: 'bold' }]}>📄 {item.item.title}</Text>
                                            {new RegExp(/^\d{2}\/\d{2}\/\d{4}$/).test(item.item.title) && <Text numberOfLines={1} style={[{ fontSize: 10, marginLeft: 20 }, noteId === item.item.id && { fontWeight: 'bold' }]}>{new Date(item.item.title).toLocaleDateString('en-US', { weekday: 'long' })}</Text>}
                                        </View>
                                    )
                                }}
                                onPress={(item) => { setNoteId(item.item.id); }}
                                onDragEnd={({ data }) => {
                                    setNotes(data);
                                    updateNotes();
                                }}
                            />
                        </View>
                    </View>
                    <View style={[{ width: `100%`, height: '100%', borderWidth: 1, borderColor: '#444444', borderLeftWidth: 0 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <TextInput spellCheck={false}
                                style={[{ width: '100%', height: 49, color: '#ffffff', padding: 10 }, root.desktopWeb && { outlineWidth: 0 }]}
                                numberOfLines={1}
                                value={noteTitle || ''}
                                onChangeText={async (value) => { setNoteTitle(value) }}
                                onBlur={() => { saveNoteTitleImmediately(); }}
                            />
                            <TouchableOpacity onPress={async () => { await API.graphql(graphqlOperation(`mutation {delete_notes_by_pk(id: "${noteId}") {id}}`)) }} style={{ width: 20 }}><Text>×</Text></TouchableOpacity>
                        </View>
                        {/* <View style={{ borderTopWidth: 1, borderColor: '#444444', borderTopStyle: 'solid', color: '#ffffff', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', padding: 10, paddingBottom: 0 }}>
                            <TouchableOpacity onPress={() => { inputRef.current.focus(); document.execCommand('bold', false, ''); }} style={{ backgroundColor: '#222222', width: 20, height: 20, borderRadius: 5 }}><Text style={{ textAlign: 'center' }}>B</Text></TouchableOpacity>
                        </View> */}
                        <ContentEditable
                            id="editable"
                            spellCheck={false}
                            innerRef={inputRef}
                            html={noteContent || ''} // innerHTML of the editable div
                            disabled={false}       // use true to disable editing
                            style={{ width: 'calc(100% - 20px)', height: '100%', overflowY: 'scroll', color: '#ffffff', padding: 10, fontSize: 12, fontFamily: 'droid', outlineWidth: 0, borderTopWidth: 1, borderColor: '#444444', borderTopStyle: 'solid' }}
                            onChange={async () => { }}
                            onBlur={async () => { saveNoteContentImmediately(); clearTimeout(timeout); }}
                            onClick={() => {
                                try {
                                    caret = CaretPositioning.saveSelection(inputRef.current);
                                }
                                catch (err) { console.log(err); }
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'r' && e.ctrlKey) {
                                    e.preventDefault();
                                    document.execCommand('enableObjectResizing', false, '');
                                    document.execCommand('enableInlineTableEditing', false, '');
                                }
                                if (e.key === 'd' && e.ctrlKey) {
                                    e.preventDefault();
                                    document.execCommand('strikeThrough', false, '');
                                }
                                else if (e.key === 'q' && e.ctrlKey) {
                                    e.preventDefault();
                                    document.execCommand('outdent', false, '');
                                }
                                else if (e.key === 'e' && e.ctrlKey) {
                                    e.preventDefault();
                                    document.execCommand('indent', false, '');
                                }
                                else if (e.key === 'l' && e.ctrlKey) {
                                    e.preventDefault();
                                    document.execCommand('insertUnorderedList', false, '');
                                }
                                else if (e.key === 'o' && e.ctrlKey) {
                                    e.preventDefault();
                                    document.execCommand('insertOrderedList', false, '');
                                }
                                else if (e.key === 'h' && e.ctrlKey) {
                                    e.preventDefault();
                                    document.execCommand('insertHorizontalRule', false, '');
                                }
                                else if (e.key === 'F1') {
                                    e.preventDefault();
                                    let timestamp = new Date().toLocaleTimeString('en-US', { hour12: true, hour: "numeric", minute: "numeric" });
                                    setNoteContent(noteContent + `<div><br/></div><div>${timestamp}</div><div><br/></div>`);
                                }
                                else if (e.key === 's' && e.ctrlKey) {
                                    e.preventDefault();
                                    clearTimeout(timeout);
                                    setLoading(true);
                                    saveNoteContentImmediately();
                                    return;
                                }
                                clearTimeout(timeout);
                                saveNoteContent();
                            }}
                        />
                    </View>
                </SplitPane>
                {loading && <LoadingComponent />}
            </View>
        </View>
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

