import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { Text, View } from '../components/Themed';
import { API, graphqlOperation } from 'aws-amplify';
import { LoadingComponent } from '../components/LoadingComponent';
import * as root from '../Root';
import { useFocusEffect } from '@react-navigation/native';
import RNPickerSelect from 'react-native-picker-select';
import { CustomDraggableFlatList } from '../components/CustomDraggableFlatList';
import { DrawerActions } from '@react-navigation/native';

export default function NotesScreen({ route, navigation, refresh, setLoading }: any) {
    const [refreshControl, setRefreshControl] = useState(false);
    const [tags, setTags] = useState([]);
    const [tag, setTag] = useState({});
    const [notes, setNotes] = useState([]);
    const [update, setUpdate] = useState(true);
    const [addingTag, setAddingTag] = useState(false);

    useFocusEffect(
        React.useCallback(() => {
            onRefresh();
        }, [])
    );

    useEffect(() => {
        onRefresh();
    }, [refresh]);

    let onRefresh = async (showRefreshControl = false) => {
        showRefreshControl ? setRefreshControl(true) : setLoading(true);

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
            notes(order_by: {order: desc}, where: {tag_id: {_eq: "${tag.id ? tag.id : tagsData.data.tags.length > 0 ? tagsData.data.tags[0].id : 'bb1871eb-929a-4a96-90e1-1ee7789e8872'}"}}) {
              id
              title
            }
          }`));
        setNotes(notesData.data.notes);
        showRefreshControl ? setRefreshControl(false) : setLoading(false);
    }

    useEffect(() => {
        updateNotes();
    }, [notes]);

    useEffect(() => {
        updateTag();
        onRefresh(false);
    }, [tag]);

    useEffect(() => {
        updateTags();
    }, [tags]);

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
        if (update && tags.length > 0) {
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
        <View style={styles.container}>
            <View style={{ padding: 10, paddingTop: 0, paddingBottom: 10, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={{ fontSize: 30, opacity: 0 }}>☰</Text>
                </TouchableOpacity>
                <RNPickerSelect
                    placeholder={{}}
                    style={{
                        inputIOS: { backgroundColor: '#000000', color: '#ffffff', borderWidth: 1, borderColor: '#444444', borderStyle: 'solid', padding: 5, marginTop: 5, marginBottom: 5, fontSize: 20, borderRadius: 10 }
                    }}
                    value={tag.id}
                    onValueChange={(value) => setTag({ title: tags.filter(obj => obj.id === value).length > 0 ? tags.filter(obj => obj.id === value)[0].title : 'null', id: value })}
                    items={tags.map(obj => { return ({ label: '📁 ' + obj.title, value: obj.id }) })}
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
            <CustomDraggableFlatList
                data={notes}
                renderItem={(item) =>
                    <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text>📄 {item.item.title}</Text>
                        <Text style={{ fontSize: 14 }}>☰</Text>
                    </View>
                }
                onPress={async (item) => { navigation.navigate('note', { id: item.item.id }) }}
                onDragEnd={({ data }) => {
                    setUpdate(true);
                    setNotes(data);
                }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshControl}
                        onRefresh={() => { onRefresh(true) }}
                        colors={["#ffffff"]}
                        tintColor='#ffffff'
                        titleColor="#ffffff"
                        title=""
                    />}
            />
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
