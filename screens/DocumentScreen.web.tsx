import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, TextInput, Platform, ActionSheetIOS, KeyboardAvoidingView, Keyboard, useWindowDimensions } from 'react-native';
import { Text, View } from '../components/Themed';
import { API, graphqlOperation } from "@aws-amplify/api";
import { LoadingComponent } from '../components/LoadingComponent';
import * as root from '../Root';
import { useFocusEffect } from '@react-navigation/native';
import { InputAccessoryViewComponent } from '../components/InputAccessoryViewComponent';
import CryptoJS from "react-native-crypto-js";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@react-navigation/native';
import { useEditor, EditorContent } from '@tiptap/react';
import Image from '@tiptap/extension-image'
import StarterKit from '@tiptap/starter-kit';
import Typography from '@tiptap/extension-typography'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import { Storage } from "@aws-amplify/storage";
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

export default function DocumentScreen({ route, navigation, setLoading }: any) {
    const [document, setDocument] = useState({ ...route?.params?.state });
    const { colors } = useTheme();
    const windowDimensions = useWindowDimensions();

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
                style: `height: calc(100vh - ${windowDimensions.width < 800 ? '180' : '165'}px);`
            },
        },
        content: ''
    })

    useFocusEffect(
        React.useCallback(() => {
            if (!route.params) { route.params = {}; }
            onRefresh();
        }, [route.params, editor])
    );

    const onRefresh = async () => {
        setLoading(true);
        let data = await API.graphql(graphqlOperation(`{
            files_by_pk(id: "${route.params.id}") {
              id
              content
              title
            }
          }
          `));
        try {
            // let e2eResult = await AsyncStorage.getItem('e2e');
            // let decrypted = CryptoJS.AES.decrypt(data.data.files_by_pk.content, e2eResult).toString(CryptoJS.enc.Utf8);
            // data.data.files_by_pk.content = decrypted;
        }
        catch (err) { console.log(err) }
        setDocument(data.data.files_by_pk);
        const selection = editor?.state.selection;
        editor?.commands.setContent(data.data.files_by_pk.content.replace(/<div><br><\/div>/g, '<p></p>').replace(/<div>/g, '<p>').replace(/<\/div>/g, '</p>'));
        editor?.commands.setTextSelection(selection);
        setLoading(false);
        navigation.setOptions({ title: data.data.files_by_pk.title });
    }

    const handleKeyDown = async (event) => {
        let charCode = String.fromCharCode(event.which).toLowerCase();
        if ((event.ctrlKey || event.metaKey) && charCode === 's') {
            event.preventDefault();
            updateDocument();
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

    const updateDocument = async () => {
        try {
            // let e2eResult = await AsyncStorage.getItem('e2e');
            const html = editor.getHTML();
            // let encrypted = CryptoJS.AES.encrypt(html, e2eResult).toString();
            await API.graphql(graphqlOperation(`mutation($content: String, $title: String) {
                updateDocument: update_files_by_pk(pk_columns: {id: "${document.id}"}, _set: {content: $content, title: $title}) {id}
            }`, { content: html, title: document.title }));
        }
        catch (err) {
            console.log(err);
        }
    }

    return (
        <View style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'flex-start'
        }}>
            <View style={{ padding: 10, paddingTop: root.desktopWeb ? 40 : 0, paddingBottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <TouchableOpacity onPress={() => {
                    navigation.goBack()
                }}><Text style={{ fontSize: 30 }}>←</Text></TouchableOpacity>
                <TextInput placeholderTextColor={colors.placeholder} spellCheck={false} inputAccessoryViewID='main' style={[{ color: colors.text, fontSize: 20, textAlign: 'center', width: '80%' }, root.desktopWeb && { outlineWidth: 0 }]} value={document.title} onChangeText={(value) => {
                    setDocument({ ...document, title: value });
                }} onBlur={() => { updateDocument(); }} />
                <TouchableOpacity onPress={async () => {
                    if (confirm(`Are you sure you want to delete this document?`)) {
                        API.graphql(graphqlOperation(`mutation {
                            delete_files_by_pk(id: "${document.id}") {
                                id
                            }
                        }`)).then((response) => {
                            navigation.goBack();
                        });
                    }
                }}><Text style={{ fontSize: 30 }}>{Platform.OS === 'ios' ? '...' : '×'}</Text></TouchableOpacity>
            </View>
            <View style={{ width: '100%', height: '100%' }}>
                <MenuBar editor={editor} colors={colors} setLoading={setLoading} />
                <EditorContent onBlur={() => { updateDocument() }} onKeyDown={handleKeyDown} spellcheck="false" editor={editor} style={{ color: colors.text, wordBreak: 'break-word' }} />
            </View>
        </View>
    );
}


const MenuBar = ({ editor, colors, setLoading }) => {
    if (!editor) {
        return null
    }

    return (
        <div style={{ borderTopWidth: 1, borderTopColor: '#444444', borderTopStyle: 'solid' }}>
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
                    setLoading(true);
                    let media = await ImageManipulator.manipulateAsync(selectedMedia.uri, [{ resize: { width: 350 } }], { compress: 1, format: ImageManipulator.SaveFormat.JPEG });
                    let response = await fetch(media.uri);
                    let blob = await response.blob();
                    let filename = `${uuidv4()}.jpg`;
                    await Storage.put(`${filename}`, blob, { contentType: blob.type, level: 'public' });
                    await API.graphql(graphqlOperation(`mutation {
                        insert_files_one(object: {title: "${filename}", type: "${blob.type}", size: "${blob.size}"}) {id}
                    }`));
                    editor.chain().focus().setImage({ src: `https://files.productabot.com/public/${filename}` }).run()
                    setLoading(false);
                }
            }}
                style={{ color: colors.text, backgroundColor: colors.card }}>
                + image
            </button>
            <button onClick={() => editor.chain().focus().undo().run()}
                style={{ color: colors.text, backgroundColor: colors.card }}>
                undo ↺
            </button>
            <button onClick={() => editor.chain().focus().redo().run()}
                style={{ color: colors.text, backgroundColor: colors.card }}>
                redo ↻
            </button>
        </div>
    )
}

