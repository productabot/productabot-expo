import React, { useState, useRef } from 'react';
import { StyleSheet, TouchableOpacity, FlatList, RefreshControl, ScrollView, Image, TextInput, useWindowDimensions, SafeAreaView, Platform, Alert } from 'react-native';
import { Text, View } from '../components/Themed';
import { Auth, API, graphqlOperation, Storage } from 'aws-amplify';
import { LoadingComponent } from '../components/LoadingComponent';
import * as root from '../Root';
import { useFocusEffect } from '@react-navigation/native';
import RNPickerSelect from 'react-native-picker-select';
import DraggableFlatList from 'react-native-draggable-flatlist';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import * as DocumentPicker from 'expo-document-picker';
import * as WebBrowser from 'expo-web-browser';
import { Menu, MenuOptions, MenuTrigger } from 'react-native-popup-menu';
import ContextMenuRenderer from '../components/ContextMenuRenderer';
import * as Haptics from 'expo-haptics';

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

let timeout: any;
export default function ProjectScreen({ route, navigation, refresh }: any) {
    const window = useWindowDimensions();
    const [loading, setLoading] = useState(false);
    const [project, setProject] = useState({ kanban_projects: [], documents: [] });
    const [colors, setColors] = useState([]);
    const [hours, setHours] = useState(0);
    const [index, setIndex] = useState(0);
    const [contextPosition, setContextPosition] = useState({ x: 0, y: 0, delete: () => { } });
    const menuRef = useRef(null);


    useFocusEffect(
        React.useCallback(() => {
            if (!route.params) { route.params = {}; }
            onRefresh();
        }, [refresh])
    );

    let onRefresh = async () => {
        setLoading(true);
        let data = await API.graphql(graphqlOperation(`{
        projects_by_pk(id: "${route.params.id}") {
            id
            name
            image
            description
            key
            color
            timesheets(order_by: {date: desc}, limit: 50) {
              id
              date
              category
              details
              hours
            }
            kanban_projects(order_by: {order: asc}) {
                id
                name
                kanban_columns(order_by: {order: asc}) {
                        name
                        kanban_items_aggregate {
                        aggregate {
                            count
                        }
                    }
                }
            }
            documents(order_by: {order: asc}) {
              id
              title
            }
            files(order_by: {order: asc}) {
              id
              name
              type
              size
            }
        }
        colors {
            label
            value
        }
        timesheets_aggregate(where: {project_id: {_eq: "${route.params.id}"}}) {
            aggregate {
              sum {
                hours
              }
            }
          }
        }`));
        setProject(data.data.projects_by_pk);
        setColors(data.data.colors.map(obj => { return ({ label: obj.label, value: obj.value, color: obj.value }) }));
        setHours(data.data.timesheets_aggregate.aggregate.sum.hours);
        setLoading(false);
    }

    const pickImage = async () => {
        try {
            let selectedMedia = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 1,
                videoExportPreset: ImagePicker.VideoExportPreset.MediumQuality
            });
            if (!selectedMedia.cancelled) {
                setLoading(true);
                let media = await ImageManipulator.manipulateAsync(selectedMedia.uri, [{ resize: { width: 500 } }], { compress: 0, format: ImageManipulator.SaveFormat.JPEG });
                let response = await fetch(media.uri);
                let blob = await response.blob();
                let filename = `${uuidv4()}.jpg`;
                await Storage.put(filename, blob, { contentType: 'image/jpeg', level: 'public' });
                try { project.image && await Storage.remove(project.image); }
                catch (err) { console.log(err); }
                setProject({ ...project, image: filename });
                // let user = await Auth.currentSession(); "us-east-2:${user.getIdToken().payload.sub}/"
                await API.graphql(graphqlOperation(`
                mutation {
                    update_projects_by_pk(pk_columns: {id: "${project.id}"}, _set: {image: "${filename}"}) {
                        id
                    }
                }`));
            }
            setLoading(false);
        } catch (err) {
            setLoading(false);
            console.log(err);
        }
    };

    return (
        <SafeAreaView style={{
            flex: 1,
            backgroundColor: '#000000',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: root.desktopWeb ? 30 : 0
        }}>
            <ScrollView
                scrollEnabled={true}
                style={{ maxWidth: Math.min(window.width, root.desktopWidth), width: '100%', height: 0, padding: 10 }}
                contentContainerStyle={{ display: 'flex', alignItems: 'center' }}
                refreshControl={
                    <RefreshControl
                        refreshing={loading}
                        onRefresh={onRefresh}
                        colors={["#ffffff"]}
                        tintColor='#ffffff'
                        titleColor="#ffffff"
                        title=""
                    />}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', width: '100%' }}>
                    <TouchableOpacity onPress={() => { pickImage(); }}>
                        {project.image ?
                            <Image
                                style={{ width: 80, height: 80, marginRight: 10, borderColor: '#ffffff', borderWidth: 1 }}
                                source={{ uri: `https://files.productabot.com/public/${project.image}` }}
                            />
                            :
                            <View style={{ width: 80, height: 80, marginRight: 10, borderColor: '#ffffff', borderWidth: 1 }} />
                        }
                    </TouchableOpacity>
                    <View style={{ width: '75%' }}>
                        <TextInput spellCheck={false} value={project.name} numberOfLines={1} style={[{ fontSize: 40, color: '#ffffff' }, root.desktopWeb && { outlineWidth: 0 }]}
                            onChangeText={(value) => { setProject({ ...project, name: value }); }}
                            onBlur={async () => {
                                await API.graphql(graphqlOperation(`mutation {
                                    update_projects_by_pk(pk_columns: {id: "${project.id}"}, _set: {name: "${project.name}"}) {
                                      id
                                    }
                                  }`));
                            }}
                        />
                        <TextInput spellCheck={false} value={project.description} numberOfLines={2} style={[{ fontSize: 20, color: '#ffffff' }, root.desktopWeb && { outlineWidth: 0 }]}
                            onChangeText={(value) => { setProject({ ...project, description: value }); }}
                            onBlur={async () => {
                                await API.graphql(graphqlOperation(`
                                mutation {
                                    update_projects_by_pk(pk_columns: {id: "${project.id}"}, _set: {description: "${project.description}"}) {
                                        id
                                    }
                                }`));
                            }}
                        />
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }}>
                                <Text style={{ fontSize: 20, color: '#ffffff' }}>key: </Text>
                                <TextInput spellCheck={false} value={project.key} numberOfLines={2} style={[{ fontSize: 20, color: '#ffffff', borderBottomColor: '#ffffff', borderBottomWidth: 1, width: 35 }, root.desktopWeb && { outlineWidth: 0 }]}
                                    onChangeText={(value) => { setProject({ ...project, key: value }); }}
                                    onBlur={async () => {
                                        await API.graphql(graphqlOperation(`
                        mutation {
                            update_projects_by_pk(pk_columns: {id: "${project.id}"}, _set: {key: "${project.key}"}) {
                                id
                            }
                        }`));
                                    }}
                                />
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }}>
                                <Text style={{ fontSize: 20, color: '#ffffff' }}>, color: </Text>
                                {Platform.OS === 'web' ?
                                    <input style={{ border: 'none' }} type="color" value={project.color} onChange={(e) => {
                                        let value = e.target.value;
                                        clearTimeout(timeout);
                                        timeout = setTimeout(async () => {
                                            await API.graphql(graphqlOperation(`
                                            mutation {
                                                update_projects_by_pk(pk_columns: {id: "${project.id}"}, _set: {color: "${value}"}) {
                                                    id
                                                }
                                            }`));
                                            setProject({ ...project, color: value });
                                        }, 1000);
                                    }} />
                                    :
                                    <RNPickerSelect
                                        placeholder={{}}
                                        style={{
                                            inputWeb: { ...styles.picker, color: '#ffffff', borderColor: project.color, backgroundColor: '#000000', marginTop: 6 },
                                            inputIOS: { ...styles.picker, color: project.color, borderColor: project.color }
                                        }}
                                        value={project.color}
                                        onValueChange={async (value) => {
                                            if (value) {
                                                setProject({ ...project, color: value });
                                                await API.graphql(graphqlOperation(`
                                        mutation {
                                            update_projects_by_pk(pk_columns: {id: "${project.id}"}, _set: {color: "${value}"}) {
                                                id
                                            }
                                        }`));
                                            }
                                        }}
                                        items={colors}
                                    />}
                            </View>
                            <Text style={{ fontSize: 20, color: '#ffffff' }}>{hours && `, ${hours} hours so far (or ${hours / 8} workdays)`}</Text>
                        </View>
                    </View>
                </View>

                <SegmentedControl
                    style={{ width: '100%', marginTop: 10, marginBottom: 10 }}
                    values={['entries', 'boards', 'documents', 'files']}
                    selectedIndex={index}
                    onChange={(e) => { setIndex(e.nativeEvent.selectedSegmentIndex) }}
                />
                <View style={{ width: '100%' }}>
                    <TouchableOpacity style={{ width: 'auto', alignSelf: 'flex-end', justifyContent: 'flex-end', alignItems: 'flex-end', marginBottom: 5 }}
                        onPress={async () => {
                            if (index === 0) {
                                navigation.navigate('calendar', { screen: 'entry', params: { project_id: project.id } })
                            }
                            else if (index === 1) {
                                setLoading(true);
                                let count = await API.graphql(graphqlOperation(`{
                                kanban_projects_aggregate(where: {project_id: {_eq: "${project.id}"}}) {
                                  aggregate {
                                    max {
                                      name
                                    }
                                    count
                                  }
                                }
                              }`));
                                let data = await API.graphql(graphqlOperation(`mutation {
                                insert_kanban_projects_one(object: {name: "${project.key + ' board ' + (parseInt(count.data.kanban_projects_aggregate.aggregate.max.name ? !isNaN(count.data.kanban_projects_aggregate.aggregate.max.name.slice(-1)) ? count.data.kanban_projects_aggregate.aggregate.max.name.slice(-1) : count.data.kanban_projects_aggregate.aggregate.count : count.data.kanban_projects_aggregate.aggregate.count) + 1)}", description:"add a description here", kanban_columns: {data: [{name: "To-do", order: 0},{name: "In Progress", order: 1},{name: "Done", order: 2}]}, project_id: "${project.id}"}) {
                                  id
                                }
                              }`));
                                setLoading(false);
                                navigation.navigate('kanban', { id: data.data.insert_kanban_projects_one.id })
                            }
                            else if (index === 2) {
                                setLoading(true);
                                let data = await API.graphql(graphqlOperation(`mutation {
                                insert_documents_one(object: {title: "New Document", content: "", order: ${project.documents.length}, project_id: "${project.id}"}) {id}
                              }`));
                                console.log(data);
                                setLoading(false);
                                navigation.navigate('document', { id: data.data.insert_documents_one.id })
                            }
                            else if (index === 3) {
                                let file = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
                                console.log(file);
                                if (file.type === 'success') {
                                    let response = await fetch(file.uri);
                                    let blob = await response.blob();
                                    await Storage.put(`${project.id}/${file.name}`, blob, { contentType: blob.type, level: 'private' });
                                    await API.graphql(graphqlOperation(`mutation {
                                        insert_files_one(object: {name: "${file.name}", type: "${blob.type}", size: "${file.size}", order: ${project.files.length}, project_id: "${project.id}"}) {id}
                                    }`));
                                    onRefresh();
                                }
                            }
                        }}
                    ><Text>add {index === 0 ? 'entry' : index === 1 ? 'board' : index === 2 ? 'document' : index === 3 ? 'file' : ''} +</Text></TouchableOpacity>
                    {index === 0 &&
                        <FlatList
                            style={{ height: window.height - 320, borderWidth: 1, borderColor: '#444444', padding: 10, borderRadius: 10 }}
                            numColumns={1}
                            data={project.timesheets}
                            renderItem={({ item, index }) => {
                                let date = new Date(item.date);
                                date.setDate(date.getDate() + 1)
                                return (
                                    <TouchableOpacity onPress={() => {
                                        navigation.navigate('calendar', { screen: 'entry', params: { id: item.id } })
                                    }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 5 }}>
                                        <Text style={{ fontSize: 14, width: '30%' }}>{`${date.toLocaleString('en-US', { year: '2-digit', month: '2-digit', day: '2-digit' })}`}{item.category ? '\n' + item.category : ''}</Text>
                                        <Text style={{ fontSize: 14, width: '50%' }}>{`${item.details}`}</Text>
                                        <Text style={{ fontSize: 14, width: '20%', textAlign: 'right' }}>{`${item.hours} hours`}</Text>
                                    </TouchableOpacity>
                                )
                            }}
                            keyExtractor={item => item.id}
                            onEndReached={() => { }}
                            ListEmptyComponent={<View></View>}
                        />
                    }
                    {index === 1 &&
                        <DraggableFlatList
                            style={{ height: window.height - 320, borderWidth: 1, borderColor: '#444444', padding: 10, borderRadius: 10 }}
                            data={project.kanban_projects}
                            renderItem={(item) => (
                                <TouchableOpacity onPress={() => { navigation.navigate('kanban', { id: item.item.id }) }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 5 }}>
                                    <Text style={{ fontSize: 14, width: '75%' }}>{`${item.item.name}`}</Text>
                                    <Text style={{ fontSize: 14, width: '20%' }}>{`${item.item.kanban_columns[2].kanban_items_aggregate.aggregate.count}/${item.item.kanban_columns[0].kanban_items_aggregate.aggregate.count + item.item.kanban_columns[1].kanban_items_aggregate.aggregate.count + item.item.kanban_columns[2].kanban_items_aggregate.aggregate.count} done`}</Text>
                                    <TouchableOpacity hitSlop={{ top: 20, left: 20, right: 20, bottom: 20 }} delayLongPress={200} onLongPress={item.drag} style={{ width: '5%', cursor: 'grab' }}><Text style={{ fontSize: 14 }}>☰</Text></TouchableOpacity>
                                </TouchableOpacity>
                            )}
                            keyExtractor={(item, index) => { return `draggable-item-${item.id}` }}
                            onEndReached={() => { }}
                            ListEmptyComponent={<View></View>}
                            dragItemOverflow={false}
                            onDragEnd={async ({ data }) => {
                                setProject({ ...project, kanban_projects: data });
                                await API.graphql(graphqlOperation(`mutation {
                                    ${data.map((kanban, kanbanIndex) => `data${kanbanIndex}: update_kanban_projects_by_pk(pk_columns: {id: "${kanban.id}"}, _set: {order: ${kanbanIndex}}) {id}`)}
                                }`));
                            }}
                        />
                    }

                    {index === 2 &&
                        <DraggableFlatList
                            style={{ width: '100%', height: window.height - 320, borderWidth: 1, borderColor: '#444444', padding: 10, borderRadius: 10 }}
                            data={project.documents}
                            contentContainerStyle={{ width: '100%' }}
                            renderItem={(item) => (
                                <TouchableOpacity onPress={() => { navigation.navigate('document', { id: item.item.id }) }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 5 }}>
                                    <Text style={{ fontSize: 14, width: '75%' }}>{`${item.item.title}`}</Text>
                                    <TouchableOpacity hitSlop={{ top: 20, left: 20, right: 20, bottom: 20 }} delayLongPress={200} onLongPress={item.drag} style={{ width: '5%', cursor: 'grab' }}><Text style={{ fontSize: 14 }}>☰</Text></TouchableOpacity>
                                </TouchableOpacity>
                            )}
                            keyExtractor={(item, index) => { return `draggable-item-${item.id}` }}
                            onEndReached={() => { }}
                            ListEmptyComponent={<View></View>}
                            dragItemOverflow={false}
                            onDragEnd={async ({ data }) => {
                                setProject({ ...project, documents: data });
                                await API.graphql(graphqlOperation(`mutation {
                                    ${data.map((document, documentIndex) => `data${documentIndex}: update_documents_by_pk(pk_columns: {id: "${document.id}"}, _set: {order: ${documentIndex}}) {id}`)}
                                }`));
                            }}
                        />}

                    {index === 3 &&
                        <DraggableFlatList
                            style={{ width: '100%', height: window.height - 320, borderWidth: 1, borderColor: '#444444', padding: 10, borderRadius: 10 }}
                            data={project.files}
                            contentContainerStyle={{ width: '100%' }}
                            renderItem={(item) => (
                                <View
                                    onStartShouldSetResponder={() => console.log('You click by View')}
                                    onContextMenu={(e) => { e.preventDefault(); console.log('hey everoyne'); }}>
                                    <TouchableOpacity
                                        onLongPress={(e) => {
                                            Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                                            setContextPosition({
                                                x: e.nativeEvent.pageX, y: e.nativeEvent.pageY,
                                                delete: async () => {
                                                    setLoading(true);
                                                    await Storage.remove(`${project.id}/${item.item.name}`, { level: 'private' });
                                                    await API.graphql(graphqlOperation(`mutation {delete_files_by_pk(id: "${item.item.id}") {id}}`));
                                                    setLoading(false);
                                                }
                                            });
                                            setTimeout(() => { menuRef.current.open() }, 0);
                                        }}
                                        onPress={async () => {
                                            let link = await Storage.get(`${project.id}/${item.item.name}`, { level: 'private', expires: 10 });
                                            await WebBrowser.openBrowserAsync(link.replace('https://pbot-prod-files.s3.us-east-2.amazonaws.com', 'https://files.productabot.com'));
                                        }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 5 }}>
                                        <Text style={{ fontSize: 14, width: '75%' }}>{`${item.item.name}`}</Text>
                                        <Text style={{ fontSize: 14, width: '22%' }}>{`${formatBytes(item.item.size)}`}</Text>
                                        <TouchableOpacity hitSlop={{ top: 20, left: 20, right: 20, bottom: 20 }} delayLongPress={200} onLongPress={item.drag} style={{ width: '5%', cursor: 'grab' }}><Text style={{ fontSize: 14 }}>☰</Text></TouchableOpacity>
                                    </TouchableOpacity>
                                </View>
                            )}
                            keyExtractor={(item, index) => { return `draggable-item-${item.id}` }}
                            onEndReached={() => { }}
                            ListEmptyComponent={<View></View>}
                            dragItemOverflow={false}
                            onDragEnd={async ({ data }) => {
                                setProject({ ...project, files: data });
                                await API.graphql(graphqlOperation(`mutation {
                                        ${data.map((file, fileIndex) => `data${fileIndex}: update_files_by_pk(pk_columns: {id: "${file.id}"}, _set: {order: ${fileIndex}}) {id}`)}
                                    }`));
                            }}
                        />}
                </View>
            </ScrollView>
            {loading && <LoadingComponent />}
            <Menu style={{ position: 'absolute', left: 0, top: 0 }} ref={menuRef} renderer={ContextMenuRenderer}>
                <MenuTrigger customStyles={{ triggerOuterWrapper: { top: contextPosition.y, left: contextPosition.x } }} />
                <MenuOptions customStyles={{ optionsWrapper: { backgroundColor: '#000000', borderColor: '#ffffff', borderWidth: 1, borderStyle: 'solid', width: 100 }, optionsContainer: { width: 100 } }}>
                    <View style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                        <TouchableOpacity style={{ backgroundColor: '#3F91A1', padding: 5, paddingLeft: 20, width: '100%' }} onPress={() => {
                            Alert.prompt('hey');
                        }} ><Text>Rename</Text></TouchableOpacity>
                        <TouchableOpacity style={{ backgroundColor: '#3F0054', padding: 5, paddingLeft: 20, width: '100%' }} onPress={async () => {
                            menuRef.current.close();
                            await contextPosition.delete();
                            await onRefresh();
                        }}><Text>Delete</Text></TouchableOpacity>
                        <TouchableOpacity style={{ backgroundColor: '#000000', padding: 5, paddingLeft: 20, width: '100%' }}
                            onPress={() => { menuRef.current.close(); }}><Text>Cancel</Text></TouchableOpacity>
                    </View>
                </MenuOptions>
            </Menu>
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    picker: { backgroundColor: '#000000', color: '#ffffff', borderWidth: 1, borderColor: '#ffffff', borderStyle: 'solid', padding: 5, marginTop: 5, marginBottom: 5, fontSize: 20 }
});