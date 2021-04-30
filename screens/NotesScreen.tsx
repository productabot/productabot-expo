import React, { useState, useEffect } from 'react';
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

export default function NotesScreen({ route, navigation, refresh }: any) {
    const window = useWindowDimensions();
    const [loading2, setLoading] = useState(false);
    const [tags, setTags] = useState([]);
    const [tag, setTag] = useState({});
    const [notes, setNotes] = useState([]);
    const [note, setNote] = useState({});
    const [update, setUpdate] = useState(true);
    const [search, setSearch] = useState('');
    const [focused, setFocused] = useState(false);
    const [addingTag, setAddingTag] = useState(false);

    // const { loading, error, data } = useSubscription(
    //     gql`subscription {
    //         tags(order_by: {order: asc}) {
    //             id
    //             title
    //         }
    //     }`);

    useFocusEffect(
        React.useCallback(() => {
            if (!focused) {
                setFocused(true);
                if (!route.params) { route.params = {}; }
                onRefresh();
            }
        }, [note])
    );

    useEffect(() => {
        onRefresh(false);
    }, [search]);

    useEffect(() => {
        onRefresh();
    }, [refresh]);

    let onRefresh = async (showLoader = true, loadNewNote = false) => {
        showLoader && setLoading(true);

        let tagsData = await API.graphql(graphqlOperation(`{
            tags(order_by: {order: asc}) {
              id
              title
            }
          }`));
        if (tagsData.data.tags.length === 0 && !addingTag) {
            setAddingTag(true);
            let newTagData = await API.graphql(graphqlOperation(`mutation {
                insert_tags_one(object: {title: "Journal", order: 0}) {
                    id
                    title
                }
            }`));
            tagsData.data.tags = [newTagData.data.insert_tags_one];
            setAddingTag(false);
        }

        setTags(tagsData.data.tags);
        if (!tag.id) {
            setTag(tagsData.data.tags[0]);
        }

        let notesData = await API.graphql(graphqlOperation(`{
            notes(order_by: {order: desc}, where: {tag_id: {_eq: "${tag.id ? tag.id : tagsData.data.tags.length > 0 ? tagsData.data.tags[0].id : 'bb1871eb-929a-4a96-90e1-1ee7789e8872'}"}${search.length > 0 ? `, content: {_ilike: "%${search}%"}` : ``}}) {
              id
              title
            }
          }`));
        setNotes(notesData.data.notes);
        if (!loadNewNote) {
            setNoteById(note.id ? note.id : notesData.data.notes.length > 0 ? notesData.data.notes[0].id : false);
        }
        else {
            setNoteById(notesData.data.notes.length > 0 ? notesData.data.notes[0].id : false);
        }
        showLoader && setLoading(false);
    }

    let setNoteById = async (id: any) => {
        if (id) {
            let noteData = await API.graphql(graphqlOperation(`{
            notes(where: {id: {_eq: "${id}"}}) {
                id
                title
                content
            }
        }`));
            if (noteData.data.notes.length > 0) {
                try {
                    let e2eResult = await AsyncStorage.getItem('e2e');
                    let decrypted = CryptoJS.AES.decrypt(noteData.data.notes[0].content, e2eResult).toString(CryptoJS.enc.Utf8);
                    noteData.data.notes[0].content = decrypted;
                    setNote(noteData.data.notes[0]);
                }
                catch (err) {
                    setNote(noteData.data.notes[0]);
                }
            }
            else {
                setNote({ title: '', id: null, content: '' });
            }
        }
        else {
            setNote({ title: '', id: null, content: '' });
        }
    }

    let enterTimestamp = async () => {
        let timestamp = new Date().toLocaleTimeString('en-US', {
            hour12: true,
            hour: "numeric",
            minute: "numeric"
        });
        setNote({ ...note, content: note.content + `${!root.desktopWeb ? '\n\n' : ''}` + timestamp + '\n' });
    }

    useEffect(() => {
        updateNotes();
    }, [notes]);

    useEffect(() => {
        if (!loading2) {
            updateTag();
            onRefresh(false, true);
        }
    }, [tag]);

    useEffect(() => {
        updateTags();
    }, [tags]);

    let updateNotes = async () => {
        if (update && notes.length > 0 && search.length === 0) {
            await API.graphql(graphqlOperation(`mutation {
                ${notes.map((note, noteIndex) => `notes${noteIndex}: update_notes_by_pk(pk_columns: {id: "${note.id}"}, _set: {order: ${(notes.length - 1) - noteIndex}, title: "${note.title}"}) {id}`)}
            }`));
            setUpdate(false);
        }
        else {
            setUpdate(true);
        }
    }

    let updateTag = async () => {
        if (update && tags.length > 0) {
            await API.graphql(graphqlOperation(`mutation($title: String) {
                ${tag.id ? `updateTag: update_tags_by_pk(pk_columns: {id: "${tag.id}"}, _set: {title: $title}) {id}` : ``}
            }`, { title: tag.title }));
            let newTags = tags;
            newTags[newTags.findIndex(obj => obj.id === tag.id)] = tag;
            setUpdate(true);
            setTags(newTags);
        }
        else {
            setUpdate(true);
        }
    }

    let updateTags = async () => {
        if (update && tags.length > 0 && search.length === 0) {
            await API.graphql(graphqlOperation(`mutation {
                ${tags.map((tag, tagIndex) => `tags${tagIndex}: update_tags_by_pk(pk_columns: {id: "${tag.id}"}, _set: {order: ${tagIndex}, title: "${tag.title}"}) {id}`)}
            }`));
            setUpdate(false);
        }
        else {
            setUpdate(true);
        }
    }

    return (
        root.desktopWeb ?
            <View style={styles.container}>
                <View style={{ height: 50 }} />
                {/* {data && <Text style={{ color: '#ffffff' }}>{JSON.stringify(data)}</Text>} */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', width: Math.min(window.width, root.desktopWidth) + 2, height: window.height - 49, maxWidth: Math.min(window.width, root.desktopWidth) + 2 }}>
                    <View style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', width: '25%', borderWidth: 1, borderColor: '#444444', borderStyle: 'solid' }}>
                        <View style={{ height: 49, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', width: '100%' }}>
                            <TextInput spellCheck={false} placeholder="search" style={{ backgroundColor: '#000000', color: '#ffffff', borderColor: '#444444', borderWidth: 1, padding: 5, borderRadius: 5, width: '100%', outlineWidth: 0, marginLeft: 10 }}
                                value={search || ''}
                                onChangeText={(value) => { setSearch(value); }}
                            />
                            <TouchableOpacity
                                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                                onPress={async () => {
                                    let dateString = new Date().toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
                                    let data = await API.graphql(graphqlOperation(`mutation {
                                insert_notes_one(object: {tag_id: "${tag.id}", title: "${dateString}", content: "", order: ${notes.length}}) {
                                  id
                                }
                              }`));
                                    let newNotes = notes;
                                    newNotes.unshift({ id: data.data.insert_notes_one.id, title: dateString, content: "" });
                                    setUpdate(false);
                                    setNotes(newNotes);
                                    setNote(newNotes[0]);
                                }} style={{ width: 40 }}><Text style={{ textAlign: 'center' }}>+</Text></TouchableOpacity>
                        </View>
                        <View style={{ flexDirection: 'row', width: '100%', height: '100%', marginBottom: -49 }}>
                            <DraggableFlatList
                                containerStyle={{ height: '100%', width: '50%', borderColor: '#444444', borderRightWidth: 1 }}
                                data={tags}
                                renderItem={(item) => {
                                    return (
                                        <TouchableOpacity
                                            onLongPress={async () => {
                                                let title = prompt('Change Tag');
                                                if (title.length === 0) {
                                                    let result = confirm('Are you sure you want to delete this tag?');
                                                    if (result) {
                                                        await API.graphql(graphqlOperation(`mutation {delete_tags_by_pk(id: "${item.item.id}") {id}}`));
                                                        let newTags = tags;
                                                        let index = tags.findIndex(obj => obj.id === tag.id);
                                                        newTags.splice(index, 1);
                                                        setUpdate(true);
                                                        setTags(newTags);
                                                        setTag(newTags[index] ? newTags[index] : newTags.length !== 0 ? newTags[0] : { title: '', id: null });
                                                    }
                                                }
                                                else {
                                                    setUpdate(true);
                                                    setTag({ ...tag, title: title });
                                                }
                                            }}
                                            onPress={() => { setUpdate(false); setTag(item.item); }} style={{ flexDirection: 'row', height: 50, padding: 10, width: '100%', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderTopWidth: 1, borderColor: '#444444', marginBottom: -1, cursor: 'pointer' }}>
                                            {(tag) && <Text style={[tag.id === item.item.id && { fontWeight: 'bold' }]}>{item.item.title}</Text>}
                                            {search.length === 0 &&
                                                <TouchableOpacity hitSlop={{ top: 20, left: 20, right: 20, bottom: 20 }} delayLongPress={200} onLongPress={item.drag} style={{ cursor: 'grab', marginLeft: 10 }}><Text style={{ fontSize: 14 }}>☰</Text></TouchableOpacity>}
                                        </TouchableOpacity>
                                    )
                                }}
                                keyExtractor={(item, index) => { return `draggable-item-${item.id}` }}
                                activationDistance={10}
                                dragItemOverflow={true}
                                onDragEnd={({ data }) => {
                                    setUpdate(true);
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
                                            setUpdate(false);
                                            setTags(newTags);
                                            setTag(newTags[newTags.length - 1]);
                                        }}><Text style={{ textAlign: 'center', color: '#aaaaaa' }}>add new tag +</Text>
                                    </TouchableOpacity>
                                )}
                            />
                            <DraggableFlatList
                                containerStyle={{ height: '100%', width: '50%' }}
                                data={notes}
                                renderItem={(item) => {
                                    return (
                                        <TouchableOpacity
                                            onPress={() => { setNoteById(item.item.id); }} style={{ flexDirection: 'row', height: 50, padding: 10, width: '100%', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderTopWidth: 1, borderColor: '#444444', marginBottom: -1, cursor: 'pointer' }}>
                                            {new RegExp(/^\d{2}\/\d{2}\/\d{4}$/).test(item.item.title) ?
                                                <View style={{ flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
                                                    <Text style={[note.id === item.item.id && { fontWeight: 'bold' }]}>{item.item.title}</Text>
                                                    <Text style={[{ fontSize: 10 }, note.id === item.item.id && { fontWeight: 'bold' }]}>{new Date(item.item.title).toLocaleDateString('en-US', { weekday: 'long' })}</Text>
                                                </View>
                                                :
                                                <Text style={[note.id === item.item.id && { fontWeight: 'bold' }]}>{item.item.title}</Text>
                                            }
                                            {search.length === 0 &&
                                                <TouchableOpacity hitSlop={{ top: 20, left: 20, right: 20, bottom: 20 }} delayLongPress={200} onLongPress={item.drag} style={{ cursor: 'grab', marginLeft: 10 }}><Text style={{ fontSize: 14 }}>☰</Text></TouchableOpacity>}
                                        </TouchableOpacity>
                                    )
                                }}
                                keyExtractor={(item, index) => { return `draggable-item-${item.id}` }}
                                activationDistance={10}
                                dragItemOverflow={true}
                                onDragEnd={({ data }) => {
                                    setUpdate(true);
                                    setNotes(data);
                                }}
                            />
                        </View>
                    </View>
                    <View style={[{ width: '75%', height: '100%', borderWidth: 1, borderColor: '#444444', borderLeftWidth: 0 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <TextInput spellCheck={false}
                                style={[{ width: '100%', height: 49, color: '#ffffff', padding: 10 }, root.desktopWeb && { outlineWidth: 0 }]}
                                numberOfLines={1}
                                value={note.title || ''}
                                onChangeText={(value) => {
                                    if (note.id) {
                                        let newNotes = notes;
                                        newNotes[notes.findIndex(obj => obj.id === note.id)].title = value;
                                        setUpdate(false);
                                        setNotes(newNotes);
                                        setNote({ ...note, title: value });
                                    }
                                }}
                                onBlur={async () => {
                                    setUpdate(true);
                                    setNotes([...notes]);
                                }}
                            />
                            <TouchableOpacity onPress={async () => {
                                await API.graphql(graphqlOperation(`mutation {delete_notes_by_pk(id: "${note.id}") {id}}`));
                                let newNotes = notes;
                                let index = notes.findIndex(obj => obj.id === note.id);
                                newNotes.splice(index, 1);

                                setUpdate(true);
                                setNotes(newNotes);
                                setNote(newNotes[index] ? newNotes[index] : newNotes.length !== 0 ? newNotes[0] : { title: '', id: null, content: '' });

                            }} style={{ width: 20 }}><Text>×</Text></TouchableOpacity>
                        </View>
                        <TextInput spellCheck={false}
                            onKeyPress={(event) => {
                                if (event.key === 'F2') {
                                    enterTimestamp();
                                }
                            }}
                            style={[{ width: '100%', height: '100%', borderTopWidth: 1, borderColor: '#444444', color: '#ffffff', padding: 10, fontSize: 12, fontFamily: 'droid' }, root.desktopWeb && { outlineWidth: 0 }]}
                            multiline={true}
                            value={note.content || ''}
                            onChangeText={(value) => {
                                if (note.id) {
                                    setUpdate(false);
                                    setNote({ ...note, content: value });
                                }
                            }}
                            onBlur={async () => {
                                if (note.id) {
                                    let e2eResult = await AsyncStorage.getItem('e2e');
                                    let encrypted = CryptoJS.AES.encrypt(note.content, e2eResult).toString();
                                    await API.graphql(graphqlOperation(`mutation($content: String, $title: String) {
                                        updateNote: update_notes_by_pk(pk_columns: {id: "${note.id}"}, _set: {content: $content, title: $title}) {id}
                                    }`, { content: encrypted, title: note.title }));
                                    let newNotes = notes;
                                    newNotes[newNotes.findIndex(obj => obj.id === note.id)] = note;
                                    setUpdate(false);
                                    setNotes(newNotes);
                                }
                            }}
                        />
                    </View>
                </View>
                {loading2 && <LoadingComponent />}
            </View>
            :
            <View style={styles.container}>
                <View style={{ padding: 10, paddingTop: 40, paddingBottom: 10, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text></Text>

                    <RNPickerSelect
                        placeholder={{}}
                        style={{
                            inputIOS: { backgroundColor: '#000000', color: '#ffffff', borderWidth: 1, borderColor: '#444444', borderStyle: 'solid', padding: 5, marginTop: 5, marginBottom: 5, fontSize: 20 }
                        }}
                        value={tag.id}
                        onValueChange={(value) => setTag({ title: tags.filter(obj => obj.id === value).length > 0 ? tags.filter(obj => obj.id === value)[0].title : 'null', id: value })}
                        items={tags.map(obj => { return ({ label: obj.title, value: obj.id }) })}
                    />
                    <TouchableOpacity onPress={async () => {
                        let dateString = new Date().toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
                        let data = await API.graphql(graphqlOperation(`mutation {
                            insert_notes_one(object: {tag_id: "${tag.id}", title: "${dateString}", content: "", order: ${notes.length}}) {
                                id
                            }
                        }`));
                        navigation.navigate('note', { id: data.data.insert_notes_one.id });
                    }}><Text style={{ fontSize: 30 }}>+</Text></TouchableOpacity>
                </View>
                <DraggableFlatList
                    containerStyle={{ height: '100%', width: '100%' }}
                    data={notes}
                    renderItem={(item) => {
                        return (
                            <TouchableOpacity
                                onPress={() => { navigation.navigate('note', { id: item.item.id }) }}
                                style={{ flexDirection: 'row', height: 50, padding: 10, width: '100%', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderTopWidth: 1, borderColor: '#444444', marginBottom: -1 }}>
                                <Text>{item.item.title}</Text>
                                <TouchableOpacity hitSlop={{ top: 20, left: 20, right: 20, bottom: 20 }} delayLongPress={200} onLongPress={item.drag} style={{ cursor: 'grab', marginLeft: 10 }}><Text style={{ fontSize: 14 }}>☰</Text></TouchableOpacity>
                            </TouchableOpacity>
                        )
                    }}
                    keyExtractor={(item, index) => { return `draggable-item-${item.id}` }}
                    activationDistance={10}
                    dragItemOverflow={true}
                    onDragEnd={({ data }) => {
                        setUpdate(true);
                        setNotes(data);
                    }}
                    refreshControl={
                        <RefreshControl
                            refreshing={loading2}
                            onRefresh={onRefresh}
                            colors={["#ffffff"]}
                            tintColor='#ffffff'
                            titleColor="#ffffff"
                            title=""
                        />}
                />
                {loading2 && <LoadingComponent />}
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
