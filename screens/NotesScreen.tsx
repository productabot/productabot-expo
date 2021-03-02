import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Text, View } from '../components/Themed';
import { API, graphqlOperation } from 'aws-amplify';
import { LoadingComponent } from '../components/LoadingComponent';
import * as root from '../Root';
import { useFocusEffect } from '@react-navigation/native';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { selectAssetSource } from 'expo-asset/build/AssetSources';

export default function NotesScreen({ route, navigation }: any) {
    const [state, setState] = useState({
        notes: [],
        note: { title: '', id: null, content: '' },
        update: true,
        layoutInvalidationKey: new Date().toISOString()
    });

    useFocusEffect(
        React.useCallback(() => {
            if (!route.params) { route.params = {}; }
            onRefresh();
        }, [])
    );

    let onRefresh = async () => {
        setState({ ...state, loading: true });
        let data = await API.graphql(graphqlOperation(`{
            notes(order_by: {order: desc}) {
              id
              title
              content
            }
          }`));
        setState({ ...state, loading: false, notes: data.data.notes, note: data.data.notes.length > 0 ? data.data.notes[0] : { title: '', id: null, content: '' } });
    }


    useEffect(() => {
        updateNote();
    }, [state.note]);

    useEffect(() => {
        updateNotes();
    }, [state.notes]);

    let updateNote = async () => {
        if (state.update && state.notes.length > 0) {
            await API.graphql(graphqlOperation(`mutation($content: String, $title: String) {
                ${state.note.id ? `updateNote: update_notes_by_pk(pk_columns: {id: "${state.note.id}"}, _set: {content: $content, title: $title}) {id}` : ``}
            }`, { content: state.note.content, title: state.note.title }));
            let newNotes = state.notes;
            newNotes[newNotes.findIndex(obj => obj.id === state.note.id)] = state.note;
            setState({ ...state, notes: newNotes, update: false });
        }
        else {
            setState({ ...state, update: true });
        }
    }

    let updateNotes = async () => {
        if (state.update && state.notes.length > 0) {
            await API.graphql(graphqlOperation(`mutation {
                ${state.notes.map((note, noteIndex) => `notes${noteIndex}: update_notes_by_pk(pk_columns: {id: "${note.id}"}, _set: {order: ${(state.notes.length - 1) - noteIndex}, title: "${note.title}"}) {id}`)}
            }`));
            setState({ ...state, update: false });
        }
        else {
            setState({ ...state, update: true });
        }
    }

    return (
        <View style={styles.container}>
            {root.desktopWeb ?
                <View style={{ height: 50 }} />
                :
                <View style={{ paddingTop: 40, paddingBottom: 10 }}>
                    <Text>Notes</Text>
                </View>}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%', height: 800, maxWidth: 800 }}>
                <DraggableFlatList
                    containerStyle={{ height: '100%', borderWidth: 1, borderColor: '#ffffff', borderStyle: 'solid' }}
                    data={state.notes}
                    renderItem={(item) => {
                        return (
                            <TouchableOpacity
                                onPress={() => { setState({ ...state, note: item.item }) }}
                                delayLongPress={100}
                                onLongPress={item.drag} style={{ flexDirection: 'row', height: 50, padding: 10, width: '100%', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#ffffff', cursor: 'grab' }}>
                                {/* <TextInput
                                    style={[{ color: '#ffffff' }, root.desktopWeb && { outlineWidth: 0 }, state.note.id === item.item.id && { fontWeight: 'bold' }]}
                                    numberOfLines={1}
                                    value={item.item.title}
                                    onChangeText={(value) => {
                                        let newNotes = state.notes;
                                        newNotes[item.index].title = value;
                                        setState({ ...state, notes: newNotes, layoutInvalidationKey: new Date().toISOString(), update: false });
                                    }}
                                    onBlur={async () => { setState({ ...state, notes: [...state.notes], layoutInvalidationKey: new Date().toISOString(), update: true }); }}
                                /> */}
                                <Text style={[state.note.id === item.item.id && { fontWeight: 'bold' }]}>{item.item.title}</Text>
                            </TouchableOpacity>
                        )
                    }}
                    keyExtractor={(item, index) => { return `draggable-item-${item.id}` }}
                    activationDistance={10}
                    dragItemOverflow={true}
                    layoutInvalidationKey={state.layoutInvalidationKey}
                    onDragEnd={({ data }) => {
                        setState({ ...state, notes: data, layoutInvalidationKey: new Date().toISOString(), update: true });
                    }}
                />
                <View style={[{ width: '80%', height: '100%', borderWidth: 1, borderColor: '#ffffff', borderLeftWidth: 0 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <TextInput
                            style={[{ width: '100%', height: 49, color: '#ffffff', padding: 10 }, root.desktopWeb && { outlineWidth: 0 }]}
                            numberOfLines={1}
                            value={state.note.title}
                            onChangeText={(value) => {
                                let newNotes = state.notes;
                                newNotes[state.notes.findIndex(obj => obj.id === state.note.id)].title = value;
                                setState({ ...state, notes: newNotes, note: { ...state.note, title: value }, layoutInvalidationKey: new Date().toISOString(), update: false });
                            }}
                            onBlur={async () => { setState({ ...state, notes: [...state.notes], layoutInvalidationKey: new Date().toISOString(), update: true }); }}
                        />
                        <TouchableOpacity onPress={async () => {
                            await API.graphql(graphqlOperation(`mutation {delete_notes_by_pk(id: "${state.note.id}") {id}}`));
                            let newNotes = state.notes;
                            let index = state.notes.findIndex(obj => obj.id === state.note.id);
                            newNotes.splice(index, 1);
                            setState({ ...state, notes: newNotes, note: newNotes[index] ? newNotes[index] : newNotes.length !== 0 ? newNotes[0] : { title: '', id: null, content: '' }, layoutInvalidationKey: new Date().toISOString(), update: true });
                        }} style={{ width: 20 }}><Text>×</Text></TouchableOpacity>
                        <TouchableOpacity onPress={async () => {
                            let dateString = new Date().toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
                            let data = await API.graphql(graphqlOperation(`mutation {
                                insert_notes_one(object: {title: "${dateString}", content: "", order: ${state.notes.length}}) {
                                  id
                                }
                              }`));
                            let newNotes = state.notes;
                            newNotes.unshift({ id: data.data.insert_notes_one.id, title: dateString, content: "" });
                            setState({ ...state, notes: newNotes, note: newNotes[0], layoutInvalidationKey: new Date().toISOString(), update: false });
                        }} style={{ width: 20 }}><Text>+</Text></TouchableOpacity>
                    </View>
                    <TextInput
                        style={[{ width: '100%', height: '100%', borderTopWidth: 1, borderColor: '#ffffff', color: '#ffffff', padding: 10 }, root.desktopWeb && { outlineWidth: 0 }]}
                        multiline={true}
                        value={state.note.content}
                        onChangeText={(value) => { setState({ ...state, note: { ...state.note, content: value }, layoutInvalidationKey: new Date().toISOString(), update: false }); }}
                        onBlur={async () => { setState({ ...state, note: { ...state.note }, layoutInvalidationKey: new Date().toISOString(), update: true }); }}
                    />
                </View>
            </View>
            {state.loading && <LoadingComponent />}
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
