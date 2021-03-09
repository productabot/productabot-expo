import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { Text, View } from '../components/Themed';
import { API, graphqlOperation } from 'aws-amplify';
import { LoadingComponent } from '../components/LoadingComponent';
import * as root from '../Root';
import { useFocusEffect } from '@react-navigation/native';
import DraggableFlatList from 'react-native-draggable-flatlist';

export default function NotesScreen({ route, navigation }: any) {
    const [loading, setLoading] = useState(false);
    const [notes, setNotes] = useState([]);
    const [note, setNote] = useState({});
    const [update, setUpdate] = useState(true);

    useFocusEffect(
        React.useCallback(() => {
            if (!route.params) { route.params = {}; }
            onRefresh();
        }, [])
    );

    let onRefresh = async () => {
        setLoading(true);
        let data = await API.graphql(graphqlOperation(`{
            notes(order_by: {order: desc}) {
              id
              title
              content
            }
          }`));
        setNotes(data.data.notes);
        setNote(data.data.notes.length > 0 ? data.data.notes[0] : { title: '', id: null, content: '' });
        setLoading(false);
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
        updateNote();
    }, [note]);

    useEffect(() => {
        updateNotes();
    }, [notes]);

    let updateNote = async () => {
        if (update && notes.length > 0) {
            await API.graphql(graphqlOperation(`mutation($content: String, $title: String) {
                ${note.id ? `updateNote: update_notes_by_pk(pk_columns: {id: "${note.id}"}, _set: {content: $content, title: $title}) {id}` : ``}
            }`, { content: note.content, title: note.title }));
            let newNotes = notes;
            newNotes[newNotes.findIndex(obj => obj.id === note.id)] = note;
            setUpdate(false);
            setNotes(newNotes);
        }
        else {
            setUpdate(true);
        }
    }

    let updateNotes = async () => {
        if (update && notes.length > 0) {
            await API.graphql(graphqlOperation(`mutation {
                ${notes.map((note, noteIndex) => `notes${noteIndex}: update_notes_by_pk(pk_columns: {id: "${note.id}"}, _set: {order: ${(notes.length - 1) - noteIndex}, title: "${note.title}"}) {id}`)}
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
                {root.desktopWeb ?
                    <View style={{ height: 50 }} />
                    :
                    <View style={{ paddingTop: 40, paddingBottom: 10 }}>
                        <Text>Notes</Text>
                    </View>}
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%', height: root.windowHeight - 60, maxWidth: root.desktopWidth }}>
                    <DraggableFlatList
                        containerStyle={{ height: '100%', borderWidth: 1, borderColor: '#ffffff', borderStyle: 'solid' }}
                        data={notes}
                        renderItem={(item) => {
                            return (
                                <TouchableOpacity
                                    onPress={() => { setNote(item.item); }} style={{ flexDirection: 'row', height: 50, padding: 10, width: '100%', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderTopWidth: 1, borderColor: '#444444', marginBottom: -1, cursor: 'pointer' }}>
                                    <Text style={[note.id === item.item.id && { fontWeight: 'bold' }]}>{item.item.title}</Text>
                                    <TouchableOpacity hitSlop={{ top: 20, left: 20, right: 20, bottom: 20 }} delayLongPress={0} onLongPress={item.drag} style={{ cursor: 'grab', marginLeft: 10 }}><Text style={{ fontSize: 14 }}>☰</Text></TouchableOpacity>
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
                    <View style={[{ width: '80%', height: '100%', borderWidth: 1, borderColor: '#ffffff', borderLeftWidth: 0 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <TextInput
                                style={[{ width: '100%', height: 49, color: '#ffffff', padding: 10 }, root.desktopWeb && { outlineWidth: 0 }]}
                                numberOfLines={1}
                                value={note.title}
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
                            <TouchableOpacity onPress={async () => {
                                let dateString = new Date().toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
                                let data = await API.graphql(graphqlOperation(`mutation {
                                insert_notes_one(object: {title: "${dateString}", content: "", order: ${notes.length}}) {
                                  id
                                }
                              }`));
                                let newNotes = notes;
                                newNotes.unshift({ id: data.data.insert_notes_one.id, title: dateString, content: "" });
                                setUpdate(false);
                                setNotes(newNotes);
                                setNote(newNotes[0]);
                            }} style={{ width: 20 }}><Text>+</Text></TouchableOpacity>
                        </View>
                        <TextInput
                            onKeyPress={(event) => {
                                if (event.key === 'F2') {
                                    enterTimestamp();
                                }
                            }}
                            style={[{ width: '100%', height: '100%', borderTopWidth: 1, borderColor: '#ffffff', color: '#ffffff', padding: 10, fontSize: 12, fontFamily: 'droid' }, root.desktopWeb && { outlineWidth: 0 }]}
                            multiline={true}
                            value={note.content}
                            onChangeText={(value) => {
                                if (note.id) {
                                    setUpdate(false);
                                    setNote({ ...note, content: value });
                                }
                            }}
                            onBlur={async () => {
                                if (note.id) {
                                    setUpdate(true);
                                    setNote({ ...note });
                                }
                            }}
                        />
                    </View>
                </View>
                {loading && <LoadingComponent />}
            </View>
            :
            <View style={styles.container}>
                <View style={{ padding: 10, paddingTop: 40, paddingBottom: 10, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text></Text>
                    <Text>Notes</Text>
                    <TouchableOpacity onPress={async () => {
                        let dateString = new Date().toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
                        let data = await API.graphql(graphqlOperation(`mutation {
                            insert_notes_one(object: {title: "${dateString}", content: "", order: ${notes.length}}) {
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
                                <TouchableOpacity hitSlop={{ top: 20, left: 20, right: 20, bottom: 20 }} delayLongPress={0} onLongPress={item.drag} style={{ cursor: 'grab', marginLeft: 10 }}><Text style={{ fontSize: 14 }}>☰</Text></TouchableOpacity>
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
                            refreshing={loading}
                            onRefresh={onRefresh}
                            colors={["#ffffff"]}
                            tintColor='#ffffff'
                            titleColor="#ffffff"
                            title=""
                        />}
                />
                {loading && <LoadingComponent />}
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
