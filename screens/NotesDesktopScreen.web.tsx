import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, TextInput, useWindowDimensions, Platform } from 'react-native';
import { Text, View } from '../components/Themed';
import { API, graphqlOperation } from "@aws-amplify/api";
import * as root from '../Root';
import { useMutation, useSubscription, gql } from "@apollo/client";
import CryptoJS from "react-native-crypto-js";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CustomDraggableFlatList } from '../components/CustomDraggableFlatList';
import SplitPane, { Pane } from 'react-split-pane';
import 'react-native-get-random-values';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import './NotesDesktopScreen.css';

let noteContentTimeout;

export default function NotesScreen({ route, navigation, refresh, setLoading }: any) {
    const windowDimensions = useWindowDimensions();
    const [key, setKey] = useState('');
    const [tags, setTags] = useState([]);
    const [tag, setTag] = useState({});
    const [notes, setNotes] = useState([]);
    const [tagId, setTagId] = useState('');
    const [search, setSearch] = useState('');
    const [hidePane, setHidePane] = useState(false);
    const [paneSize, setPaneSize] = useState(315);
    const [noteTitle, setNoteTitle] = useState('');
    const [noteId, setNoteId] = useState('');
    const [noteContent, setNoteContent] = useState('');
    const [saved, setSaved] = useState(true);

    const editor = useEditor({
        extensions: [
            StarterKit,
        ],
        content: '',
        onUpdate: async ({ editor }) => {
            const html = editor.getHTML();
            setNoteContent(html);
        },
    })

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
                if (noteId.length === 0) {
                    setNoteId(data.tags[0].notes[0].id);
                }
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

                const { from, to } = editor.state.selection;
                //the regexes are a temporary fix for interpreting old notes saved with a plain contenteditable
                editor.commands.setContent(data.notes_by_pk.content.replace(/<div><br><\/div>/g, '<p></p>').replace(/<div>/g, '<p>').replace(/<\/div>/g, '</p>'));
                editor.commands.setTextSelection({ from, to });
                setSaved(true);
            }
        });

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


    useEffect(() => {
        const updateNoteContent = async () => {
            clearTimeout(noteContentTimeout);
            setLoading(true);
            try {
                await API.graphql(graphqlOperation(`mutation($content: String) {
                    updateNote: update_notes_by_pk(pk_columns: {id: "${noteId}"}, _set: {content: $content}) {id}
                }`, { content: CryptoJS.AES.encrypt(noteContent, key).toString() }));
                setLoading(false);
                setSaved(true);
            }
            catch (err) {
                console.log(err);
                setLoading(false);
            }
        }
        clearTimeout(noteContentTimeout);
        if (saved) {
            setSaved(false);
        }
        noteContentTimeout = setTimeout(() => {
            updateNoteContent();
        }, 2500);
    }, [noteContent]);


    const saveNoteTitleImmediately = async (value) => {
        await API.graphql(graphqlOperation(`mutation($title: String) {
            updateNote: update_notes_by_pk(pk_columns: {id: "${noteId}"}, _set: {title: $title}) {id}
        }`, { title: value ? value : noteTitle }));
    }

    const handleKeyDown = async (event) => {
        let charCode = String.fromCharCode(event.which).toLowerCase();
        if ((event.ctrlKey || event.metaKey) && charCode === 's') {
            event.preventDefault();
            setLoading(true);
            try {
                await API.graphql(graphqlOperation(`mutation($content: String) {
                    updateNote: update_notes_by_pk(pk_columns: {id: "${noteId}"}, _set: {content: $content}) {id}
                }`, { content: CryptoJS.AES.encrypt(noteContent, key).toString() }));
                setLoading(false);
            }
            catch (err) {
                console.log(err);
                setLoading(false);
            }
        }
    }

    return (
        <View style={styles.container}>
            <View style={{ height: 50 }} />
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', width: Math.min(windowDimensions.width, root.desktopWidth) + 2, height: windowDimensions.height - 49, maxWidth: Math.min(windowDimensions.width, root.desktopWidth) + 2 }}>
                <SplitPane split="vertical" pane1Style={hidePane && { display: 'none' }} defaultSize={paneSize} resizerStyle={{ width: 4, backgroundColor: '#444444', cursor: 'col-resize' }} onResizerDoubleClick={(e) => { setHidePane(!hidePane) }} onChange={(size) => { setPaneSize(size) }} >
                    <View style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', width: `100%`, borderWidth: 1, borderColor: '#444444', borderStyle: 'solid', borderRightWidth: 0, borderTopLeftRadius: windowDimensions.width < root.desktopWidth ? 0 : 10 }}>
                        <View style={{ height: 49, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', width: '100%' }}>
                            <TextInput spellCheck={false} placeholder="search" style={{ backgroundColor: '#000000', color: '#ffffff', borderColor: '#444444', borderWidth: 1, padding: 5, borderRadius: 5, width: '100%', outlineWidth: 0, marginLeft: 10 }}
                                value={search || ''}
                                onChangeText={(value) => { setSearch(value); }}
                            />
                            <TouchableOpacity
                                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginLeft: 10, marginRight: 10 }}
                                onPress={async () => {
                                    let dateString = new Date().toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
                                    await API.graphql(graphqlOperation(`mutation {
                                insert_notes_one(object: {tag_id: "${tag.id}", title: "${dateString}", content: "", order: ${notes.length}}) {
                                  id
                                }
                              }`));
                                }}><Text style={{ textAlign: 'center' }}>add note +</Text></TouchableOpacity>
                        </View>
                        <View style={{ flexDirection: 'row', width: '100%', height: '100%', marginBottom: -49, borderTopColor: '#444444', borderTopWidth: 1, borderStyle: 'solid', flexGrow: 1 }}>
                            {paneSize >= 220 &&
                                <View style={{ width: '50%', maxWidth: 150 }}>
                                    <CustomDraggableFlatList
                                        delayDragOnWeb={true}
                                        renderItemStyle={{ marginLeft: 5, marginRight: 5, paddingLeft: 7.5, paddingRight: 7.5 }}
                                        noBorder={true}
                                        data={tags}
                                        virtualHeight={windowDimensions.height - 102}
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
                                delayDragOnWeb={true}
                                renderItemStyle={{ marginLeft: 5, marginRight: 5, paddingLeft: 7.5, paddingRight: 7.5 }}
                                noBorder={true}
                                data={notes}
                                onContextMenu={(item) => { alert('hey'); }}
                                virtualHeight={windowDimensions.height - 102}
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
                    <View style={[{ width: `100%`, height: '100%', borderWidth: 1, borderColor: '#444444', borderLeftWidth: 0, borderTopRightRadius: windowDimensions.width < root.desktopWidth ? 0 : 10 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <TextInput spellCheck={false}
                                style={[{ width: '100%', height: 49, color: '#ffffff', padding: 10 }, root.desktopWeb && { outlineWidth: 0 }]}
                                numberOfLines={1}
                                value={noteTitle || ''}
                                onChangeText={async (value) => { setNoteTitle(value) }}
                                onBlur={() => { saveNoteTitleImmediately(); }}
                            />
                            {<span style={{ color: '#cccccc', fontFamily: 'arial', fontSize: 12, marginRight: 20 }}>{saved ? '' : 'unsaved'}</span>}
                            <TouchableOpacity onPress={async () => {
                                if (confirm('Are you sure you want to delete this note?')) {
                                    await API.graphql(graphqlOperation(`mutation {delete_notes_by_pk(id: "${noteId}") {id}}`));
                                }
                            }} ><span style={{ color: '#aa0000', fontFamily: 'arial', fontSize: 12, marginRight: 10, cursor: 'pointer' }}>delete</span></TouchableOpacity>
                        </View>
                        <MenuBar editor={editor} />
                        <EditorContent onKeyDown={handleKeyDown} editor={editor} />
                    </View>
                </SplitPane>
            </View>
        </View>
    );
}

const MenuBar = ({ editor }) => {
    if (!editor) {
        return null
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#444444', borderTopStyle: 'solid' }}>
            <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={editor.isActive('bold') ? 'is-active' : ''}
            >
                bold
            </button>
            <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={editor.isActive('italic') ? 'is-active' : ''}
            >
                italic
            </button>
            <button
                onClick={() => editor.chain().focus().toggleStrike().run()}
                className={editor.isActive('strike') ? 'is-active' : ''}
            >
                strike
            </button>
            <button
                onClick={() => editor.chain().focus().toggleCode().run()}
                className={editor.isActive('code') ? 'is-active' : ''}
            >
                code
            </button>
            <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
            >
                h1
            </button>
            <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
            >
                h2
            </button>
            <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}
            >
                h3
            </button>
            <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
                className={editor.isActive('heading', { level: 4 }) ? 'is-active' : ''}
            >
                h4
            </button>
            <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 5 }).run()}
                className={editor.isActive('heading', { level: 5 }) ? 'is-active' : ''}
            >
                h5
            </button>
            <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 6 }).run()}
                className={editor.isActive('heading', { level: 6 }) ? 'is-active' : ''}
            >
                h6
            </button>
            <button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={editor.isActive('bulletList') ? 'is-active' : ''}
            >
                bullet list
            </button>
            <button
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={editor.isActive('orderedList') ? 'is-active' : ''}
            >
                ordered list
            </button>
            <button
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                className={editor.isActive('codeBlock') ? 'is-active' : ''}
            >
                code block
            </button>
            <button
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={editor.isActive('blockquote') ? 'is-active' : ''}
            >
                block quote
            </button>
            <button onClick={() => editor.chain().focus().setHorizontalRule().run()}>
                horizontal rule
            </button>
            <button onClick={() => editor.chain().focus().setHardBreak().run()}>
                hard break
            </button>
            <button onClick={() => editor.chain().focus().undo().run()}>
                undo
            </button>
            <button onClick={() => editor.chain().focus().redo().run()}>
                redo
            </button>
        </div>
    )
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
        alignItems: 'center',
        justifyContent: 'flex-start'
    }
});

