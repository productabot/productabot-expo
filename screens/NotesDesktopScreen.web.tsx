import React, { useState, useEffect, useRef } from 'react';
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
import Image from '@tiptap/extension-image'
import StarterKit from '@tiptap/starter-kit';
import Typography from '@tiptap/extension-typography'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import './NotesDesktopScreen.css';
import { Menu, MenuOptions, MenuTrigger } from 'react-native-popup-menu';
import ContextMenuRenderer from '../components/ContextMenuRenderer';
import { useTheme } from '@react-navigation/native';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Storage } from "@aws-amplify/storage";

let noteContentTimeout;
let originalEditorState;

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
    const [contextPosition, setContextPosition] = useState({ x: 0, y: 0, rename: () => { }, delete: () => { } });
    const menuRef = useRef(null);
    const { colors } = useTheme();

    const editor = useEditor({
        extensions: [
            StarterKit.configure({ dropcursor: true }),
            Image.configure({ inline: true }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
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
        editorProps: {
            attributes: {
                style: `height: calc(100vh - ${windowDimensions.width < 1055 ? '180' : '165'}px);`
            },
        },
        content: '',
        onUpdate: async ({ editor }) => {
            const html = editor.getHTML();
            clearTimeout(noteContentTimeout);
            if (saved) {
                setSaved(false);
            }
            noteContentTimeout = setTimeout(() => {
                setNoteContent(html);
            }, 5000);
        },
        onCreate: async ({ editor }) => {
            originalEditorState = editor?.view.state;
        }
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
                    setNoteId(data.tags[0]?.notes[0]?.id);
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
                /*
                try {
                    data.notes_by_pk.content = CryptoJS.AES.decrypt(data.notes_by_pk.content, key).toString(CryptoJS.enc.Utf8).replace(/\n/g, "<br />").replace(/\n\n/g, "<p/>");
                }
                catch (err) {
                    console.log(err);
                }
                */

                setNoteTitle(data.notes_by_pk.title);

                const { from, to } = editor.state.selection;
                //the regexes are a temporary fix for interpreting old notes saved with a plain contenteditable
                editor.commands.setContent(data.notes_by_pk.content.replace(/<div><br><\/div>/g, '<p></p>').replace(/<div>/g, '<p>').replace(/<\/div>/g, '</p>'));
                editor.commands.setTextSelection({ from, to });

                //are we seeing a new note? if so, let's delete the previous history
                if (noteTitle !== '' && noteTitle !== data.notes_by_pk.title) {
                    let newState = originalEditorState;
                    newState.doc = editor?.view.state.doc;
                    editor.view.updateState(newState);
                }

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
                }`, { content: noteContent }));
                //CryptoJS.AES.encrypt(noteContent, key).toString()
                setLoading(false);
                setSaved(true);
            }
            catch (err) {
                console.log(err);
                setLoading(false);
            }
        }
        updateNoteContent();
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
            try {
                const html = editor.getHTML();
                setNoteContent(html);
            }
            catch (err) {
                console.log(err);
            }
        }
        else if (event.shiftKey && event.key === "Tab") {
            event.preventDefault();
            document.execCommand('outdent', false);
        }
        else if (event.key === "Tab") {
            event.preventDefault();
            const { from, to } = editor.state.selection;
            if (editor.isActive('bulletList') || editor.isActive('orderedList')) {
                return;
            }
            if (from === to) {
                editor.chain().focus().insertContent(`	`).run();
            }
            else {
                document.execCommand('indent', false);
            }
        }
    }

    return (
        <View style={{
            flex: 1,
            backgroundColor: colors.background,
            alignItems: 'center',
            justifyContent: 'flex-start'
        }}>
            <View style={{ height: 50 }} />
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', width: windowDimensions.width, height: windowDimensions.height - 49, maxWidth: windowDimensions.width }}>
                <SplitPane split="vertical" pane1Style={hidePane && { display: 'none' }} defaultSize={paneSize} resizerStyle={{ width: 4, backgroundColor: `${colors.subtitle}66`, cursor: 'col-resize' }} onResizerDoubleClick={(e) => { setHidePane(!hidePane) }} onChange={(size) => { setPaneSize(size) }} >
                    <View style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', width: `100%`, borderWidth: 1, borderColor: `${colors.subtitle}66`, borderStyle: 'solid', borderRightWidth: 0, borderLeftWidth: 0 }}>
                        <View style={{ height: 49, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', width: '100%' }}>
                            <TouchableOpacity
                                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                                onPress={async () => {
                                    let title = prompt('Folder title?');
                                    let data = await API.graphql(graphqlOperation(`mutation {
                                                insert_tags_one(object: {title: "${title}", order: ${tags.length}}) {
                                                id
                                                }
                                            }`));
                                    let newTags = tags;
                                    newTags.push({ id: data.data.insert_tags_one.id, title: title });
                                    setTags(newTags);
                                    setTag(newTags[newTags.length - 1]);
                                    setTimeout(() => { setLoading(false); }, 500);
                                }}><Text numberOfLines={1} style={{ textAlign: 'center', color: colors.text }}>add folder +</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                                onPress={async () => {
                                    let dateString = new Date().toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
                                    let newNoteId = await API.graphql(graphqlOperation(`mutation {
                                insert_notes_one(object: {tag_id: "${tag.id}", title: "${tag.title === 'journal' ? dateString : 'untitled'}", content: "", order: ${notes.length}}) {
                                  id
                                }
                              }`));
                                    clearTimeout(noteContentTimeout);
                                    setNoteId(newNoteId.data.insert_notes_one.id);
                                }}><Text style={{ textAlign: 'center' }}>add note +</Text></TouchableOpacity>
                        </View>
                        <View style={{ flexDirection: 'row', width: '100%', height: '100%', marginBottom: -49, borderTopColor: `${colors.subtitle}66`, borderTopWidth: 1, borderStyle: 'solid', flexGrow: 1, userSelect: 'none' }}>
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
                                        menuRef={menuRef}
                                        setContextPosition={setContextPosition}
                                        onDelete={async (item) => {
                                            if (confirm('Are you sure you want to delete this folder?')) {
                                                if (tagId === item.item.id) {
                                                    setTagId('');
                                                }
                                                await API.graphql(graphqlOperation(`mutation {delete_tags_by_pk(id: "${item.item.id}") {id}}`));
                                            }
                                            setTimeout(() => { setLoading(false); }, 500);
                                        }}
                                        onRename={async (item) => {
                                            let title = prompt('What would you like to rename this folder to?', item.item.title);
                                            if (title) {
                                                await API.graphql(graphqlOperation(`mutation {update_tags_by_pk(pk_columns: {id: "${item.item.id}"}, _set: {title: "${title}"}) {id}}`));
                                            }
                                            setTimeout(() => { setLoading(false); }, 500);
                                        }}
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
                                onPress={(item) => { clearTimeout(noteContentTimeout); setNoteId(item.item.id); }}
                                onDragEnd={({ data }) => {
                                    setNotes(data);
                                    updateNotes();
                                }}
                                menuRef={menuRef}
                                setContextPosition={setContextPosition}
                                onDelete={async (item) => {
                                    if (confirm('Are you sure you want to delete this note?')) {
                                        if (item.item.id === noteId) {
                                            let filteredNotes = notes.filter(obj => obj.id !== noteId);
                                            setNoteId(filteredNotes.length > 0 ? filteredNotes[0].id : '');
                                        }
                                        await API.graphql(graphqlOperation(`mutation {delete_notes_by_pk(id: "${item.item.id}") {id}}`));
                                        setTimeout(() => { setLoading(false); }, 500);
                                    }
                                }}
                                onRename={async (item) => {
                                    let title = prompt('What would you like to rename this note to?', item.item.title);
                                    if (title) {
                                        await API.graphql(graphqlOperation(`mutation {update_notes_by_pk(pk_columns: {id: "${item.item.id}"}, _set: {title: "${title}"}) {id}}`));
                                        setTimeout(() => { setLoading(false); }, 500);
                                    }
                                }}
                            />
                        </View>
                    </View>
                    <View style={[{ width: `100%`, height: '100%', borderWidth: 1, borderColor: `${colors.subtitle}66`, borderLeftWidth: 0, borderRightWidth: 0 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <TextInput placeholderTextColor={colors.placeholder} spellCheck={false}
                                style={[{ width: '100%', height: 49, color: colors.text, padding: 10 }, root.desktopWeb && { outlineWidth: 0 }]}
                                numberOfLines={1}
                                value={noteTitle || ''}
                                onChangeText={async (value) => { setNoteTitle(value) }}
                                onBlur={() => { saveNoteTitleImmediately(); }}
                            />
                            {<span style={{ color: '#cccccc', fontFamily: 'arial', fontSize: 12, marginRight: 20 }}>{saved ? '' : 'unsaved'}</span>}
                            <TouchableOpacity onPress={async () => {
                                if (confirm('Are you sure you want to delete this note?')) {
                                    let filteredNotes = notes.filter(obj => obj.id !== noteId);
                                    setNoteId(filteredNotes.length > 0 ? filteredNotes[0].id : '');
                                    await API.graphql(graphqlOperation(`mutation {delete_notes_by_pk(id: "${noteId}") {id}}`));
                                }
                            }} ><span style={{ color: '#aa0000', fontFamily: 'arial', fontSize: 12, marginRight: 10, cursor: 'pointer' }}>delete</span></TouchableOpacity>
                        </View>
                        <MenuBar editor={editor} />
                        <EditorContent onKeyDown={handleKeyDown} spellcheck="false" editor={editor} style={{ color: colors.text, wordBreak: 'break-word' }} />
                    </View>
                </SplitPane>
            </View>

            <Menu style={{ position: 'absolute', left: 0, top: 0 }} ref={menuRef} renderer={ContextMenuRenderer} >
                <MenuTrigger customStyles={{ triggerOuterWrapper: { top: contextPosition.y - 40, left: contextPosition.x } }} />
                <MenuOptions style={{ flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', backgroundColor: colors.background, borderColor: colors.text, borderWidth: 1, borderStyle: 'solid', borderRadius: 10, width: 100, paddingLeft: 15, paddingTop: 5, paddingBottom: 5 }}>
                    {contextPosition.rename && <TouchableOpacity style={{ padding: 5, width: '100%' }} onPress={async () => {
                        menuRef.current.close();
                        await contextPosition.rename();
                    }} ><Text style={{ color: colors.text }}>Rename</Text></TouchableOpacity>}
                    {contextPosition.delete && <TouchableOpacity style={{ padding: 5, width: '100%' }} onPress={async () => {
                        menuRef.current.close();
                        await contextPosition.delete();
                    }}><Text style={{ color: colors.delete }}>Delete</Text></TouchableOpacity>}
                    <TouchableOpacity style={{ padding: 5, width: '100%' }}
                        onPress={() => { menuRef.current.close(); }}><Text style={{ color: colors.text }}>Cancel</Text></TouchableOpacity>
                </MenuOptions>
            </Menu>
        </View>
    );
}

const MenuBar = ({ editor }) => {
    if (!editor) {
        return null
    }
    const { colors } = useTheme();

    return (
        <div style={{ borderTopWidth: 1, borderTopColor: `${colors.subtitle}66`, borderTopStyle: 'solid', display: 'inline-flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', alignItems: 'center' }}>
            <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={editor.isActive('bold') ? 'is-active' : ''}
                style={{ color: colors.text, backgroundColor: colors.card, fontWeight: 800 }}
            >
                B
            </button>
            <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={editor.isActive('italic') ? 'is-active' : ''}
                style={{ color: colors.text, backgroundColor: colors.card, fontStyle: 'italic' }}
            >
                I
            </button>
            <button
                onClick={() => editor.chain().focus().toggleStrike().run()}
                className={editor.isActive('strike') ? 'is-active' : ''}
                style={{ color: colors.text, backgroundColor: colors.card, textDecorationLine: 'line-through' }}
            >
                S
            </button>
            <button
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                className={editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''}
                style={{ color: colors.text, backgroundColor: colors.card }}
            >
                {`⬱`}
            </button>
            <button
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                className={editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}
                style={{ color: colors.text, backgroundColor: colors.card }}
            >
                {`☰`}
            </button>
            <button
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                className={editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}
                style={{ color: colors.text, backgroundColor: colors.card }}
            >
                {`⇶`}
            </button>
            <button
                onClick={() => document.execCommand('outdent', false)}
                className={editor.isActive('codeBlock') ? 'is-active' : ''}
                style={{ color: colors.text, backgroundColor: colors.card }}
            >
                {`←`}
            </button>
            <button
                onClick={() => document.execCommand('indent', false)}
                className={editor.isActive('codeBlock') ? 'is-active' : ''}
                style={{ color: colors.text, backgroundColor: colors.card }}
            >
                {`→`}
            </button>
            <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
                style={{ color: colors.text, backgroundColor: colors.card }}
            >
                h1
            </button>
            <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
                style={{ color: colors.text, backgroundColor: colors.card }}
            >
                h2
            </button>
            <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}
                style={{ color: colors.text, backgroundColor: colors.card }}
            >
                h3
            </button>
            <button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={editor.isActive('bulletList') ? 'is-active' : ''}
                style={{ color: colors.text, backgroundColor: colors.card }}
            >
                ≔
            </button>
            <button
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={editor.isActive('orderedList') ? 'is-active' : ''}
                style={{ color: colors.text, backgroundColor: colors.card }}
            >
                #
            </button>
            <button
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                className={editor.isActive('codeBlock') ? 'is-active' : ''}
                style={{ color: colors.text, backgroundColor: colors.card }}
            >
                {`<>`}
            </button>
            <button
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={editor.isActive('blockquote') ? 'is-active' : ''}
                style={{ color: colors.text, backgroundColor: colors.card }}
            >
                ❝
            </button>
            <button onClick={() => editor.chain().focus().setHorizontalRule().run()}
                style={{ color: colors.text, backgroundColor: colors.card }}>
                ―
            </button>
            <button onClick={() => editor.chain().focus().setHardBreak().run()}
                style={{ color: colors.text, backgroundColor: colors.card }}>
                ¶
            </button>
            <button onClick={async () => {
                let selectedMedia = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.All,
                    allowsEditing: false,
                    quality: 1,
                    videoExportPreset: ImagePicker.VideoExportPreset.MediumQuality
                });
                if (!selectedMedia.cancelled) {
                    let media = await ImageManipulator.manipulateAsync(selectedMedia.uri, [{ resize: { width: 350 } }], { compress: 1, format: ImageManipulator.SaveFormat.JPEG });
                    let response = await fetch(media.uri);
                    let blob = await response.blob();
                    let filename = `${uuidv4()}.jpg`;
                    await Storage.put(`${filename}`, blob, { contentType: blob.type, level: 'public' });
                    await API.graphql(graphqlOperation(`mutation {
                        insert_files_one(object: {title: "${filename}", type: "${blob.type}", size: "${blob.size}"}) {id}
                    }`));
                    editor.chain().focus().setImage({ src: `https://files.productabot.com/public/${filename}` }).run()
                }
            }}
                style={{ color: colors.text, backgroundColor: colors.card }}>
                image
            </button>
            <button onClick={() => editor.chain().focus().undo().run()}
                style={{ color: colors.text, backgroundColor: colors.card }}>
                ↺
            </button>
            <button onClick={() => editor.chain().focus().redo().run()}
                style={{ color: colors.text, backgroundColor: colors.card }}>
                ↻
            </button>
        </div >
    )
}

