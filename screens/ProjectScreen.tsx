import React, { useState, useRef } from 'react';
import { StyleSheet, TouchableOpacity, Image, TextInput, useWindowDimensions, Platform, Alert, Animated, Easing, FlatList, ActionSheetIOS } from 'react-native';
import { Text, View } from '../components/Themed';
import { Storage } from "@aws-amplify/storage";
import { API, graphqlOperation } from "@aws-amplify/api";
import { Auth } from "@aws-amplify/auth";
import * as root from '../Root';
import { useFocusEffect } from '@react-navigation/native';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as DocumentPicker from 'expo-document-picker';
import * as WebBrowser from 'expo-web-browser';
import { Menu, MenuOptions, MenuTrigger } from 'react-native-popup-menu';
import ContextMenuRenderer from '../components/ContextMenuRenderer';
import { InputAccessoryViewComponent } from '../components/InputAccessoryViewComponent';
import { WebView } from 'react-native-webview';
import { CustomDraggableFlatList } from '../components/CustomDraggableFlatList';
import { useTheme } from '@react-navigation/native';
const chartColors = ['#FF6633', '#FFB399', '#FF33FF', '#FFFF99', '#00B3E6',
    '#E6B333', '#3366E6', '#999966', '#99FF99', '#B34D4D',
    '#80B300', '#809900', '#E6B3B3', '#6680B3', '#66991A',
    '#FF99E6', '#CCFF1A', '#FF1A66', '#E6331A', '#33FFCC',
    '#66994D', '#B366CC', '#4D8000', '#B33300', '#CC80CC',
    '#66664D', '#991AFF', '#E666FF', '#4DB3FF', '#1AB399',
    '#E666B3', '#33991A', '#CC9999', '#B3B31A', '#00E680',
    '#4D8066', '#809980', '#E6FF80', '#1AFF33', '#999933',
    '#FF3380', '#CCCC00', '#66E64D', '#4D80CC', '#9900B3',
    '#E64D66', '#4DB380', '#FF4D4D', '#99E6E6', '#6666FF'];

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

let timeout: any;
let goalTimeout: any;

let dateFrom = new Date();
dateFrom.setDate(1);
const dateFromString = dateFrom.toISOString().split('T')[0];
let dateTo = new Date();
dateTo.setMonth(dateTo.getMonth() + 1);
dateTo.setDate(0);
const dateToString = dateTo.toISOString().split('T')[0];

let uploadTimeout: any;
let dropFunction = async (e) => { };

export default function ProjectScreen({ route, navigation, refresh, setLoading }: any) {
    const window = useWindowDimensions();
    const [project, setProject] = useState({ ...route.params.state, tasks: [], files: [], entries: [], folders: [] });
    const [contextPosition, setContextPosition] = useState({ x: 0, y: 0, rename: () => { }, delete: () => { } });
    const menuRef = useRef(null);
    const folderRef = useRef(null);
    const inputRef = useRef(null);
    const [settings, setSettings] = useState(false);
    const [count, setCount] = useState({});
    const [folder, setFolder] = useState('');
    const [identityId, setIdentityId] = useState('');
    const [itemToMove, setItemToMove] = useState(null);
    const { colors } = useTheme();
    const opacity = useRef(new Animated.Value(Platform.OS === 'web' ? 1 : 0)).current;

    React.useEffect(() => {
        const async = async () => {
            let user = await Auth.currentCredentials()
            setIdentityId(user.identityId);
        }
        async();
    }, [])

    React.useEffect(() => {
        if (Platform.OS === 'web') {
            dropFunction = async (e) => {
                let files = e.dataTransfer.files;
                clearTimeout(uploadTimeout);
                uploadTimeout = setTimeout(async () => {
                    setLoading(true);
                    for (const file of files) {
                        // const blob = new Blob([file], { type: file.type });
                        await Storage.put(`${project.id}/${file.name}`, file, { contentType: file.type, level: 'private' });
                        await API.graphql(graphqlOperation(`mutation {
                        insert_files_one(object: {title: "${file.name}", type: "${file.type}", size: "${file.size}", order: ${project.files.length}, project_id: "${project.id}"}) {id}
                        }`));
                    }
                    setLoading(false);
                    onRefresh();
                }, 100);
            }
            const dropzone = document.getElementById('root');
            ['drag', 'dragstart', 'dragend', 'dragover', 'dragenter', 'dragleave', 'drop'].forEach(function (event) {
                dropzone.addEventListener(event, function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                });
            });
            dropzone.addEventListener('drop', dropFunction, false);
        }
    }, [project]);

    useFocusEffect(
        React.useCallback(() => {
            if (!route.params) { route.params = {}; }
            onRefresh();
            return () => {
                // if (Platform.OS === 'web') {
                //     const dropzone = document.getElementById('root');
                //     dropzone.removeEventListener('drop', dropFunction, false);
                // }
            }
        }, [refresh, route.params, folder])
    );

    let onRefresh = async () => {
        setLoading(true);
        let data = await API.graphql(graphqlOperation(`{
            projects_by_pk(id: "${route.params.id}"){
                id
                name
                image
                description
                key
                color
                public
                goal
                website
                entries(order_by: {date: desc}, limit: 50) {
                    id
                    date
                    category
                    details
                    hours
                }
                tasks(order_by: {order: desc}, limit: 50) {
                    id
                    created_at
                    category
                    details
                    comments_aggregate {
                        aggregate {
                            count
                        }
                    }
                }
                files(order_by: {order: desc}, where: {folder_id: {${folder ? `_eq: "${folder.id}"` : `_is_null: true`}}}) {
                    id
                    title
                    type
                    size
                    order
                    updated_at
                    folder {
                        id
                        title
                        folder {
                            id
                            title
                            folder {
                                id
                                title
                                folder {
                                    id
                                    title
                                    folder {
                                        id
                                        title
                                    }
                                }
                            }
                        }
                    }
                }
                folders: files(where: {type: {_eq: "folder"}}) {
                    id
                    title
                    folder {
                        id
                        title
                        folder {
                            id
                            title
                            folder {
                                id
                                title
                                folder {
                                    id
                                    title
                                }
                            }
                        }
                    } 
                }
            }
            entries_aggregate(where: {project_id: {_eq: "${route.params.id}"}}) {
                aggregate {
                    count
                    sum { hours }
                }
            }
            tasks_aggregate(where: {project_id: {_eq: "${route.params.id}"}}) {
                aggregate {
                    count
                }
            }
            files_aggregate(where: {project_id: {_eq: "${route.params.id}"}}) {
                aggregate {
                    count
                    sum { size }
                }
            }
            goal_aggregate: entries_aggregate(where: {project_id: {_eq: "${route.params.id}"}, date: {_gte: "${dateFromString}", _lte: "${dateToString}"}}) {
                aggregate {
                    count
                    sum { hours }
                }
            }
        }`));
        setProject(data.data.projects_by_pk);
        setCount({ entries: data.data.entries_aggregate.aggregate.count, tasks: data.data.tasks_aggregate.aggregate.count, files: data.data.files_aggregate.aggregate.count, fileSize: data.data.files_aggregate.aggregate.sum.size, timesheetHours: data.data.entries_aggregate.aggregate.sum.hours, weeklyGoal: ((data.data.goal_aggregate.aggregate.sum.hours / data.data.projects_by_pk.goal) * 100).toFixed(0), weeklyGoalHours: data.data.goal_aggregate.aggregate.sum.hours });
        setLoading(false);
        Animated.sequence([Animated.timing(opacity, { toValue: 1, duration: Platform.OS === 'web' ? 1 : 100, easing: Easing.linear, useNativeDriver: true })]).start();
    }

    const pickImage = async (type = 'thumbnail') => {
        try {
            let selectedMedia;

            if (['thumbnail', 'file'].includes(type)) {
                selectedMedia = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.All,
                    allowsEditing: type === 'thumbnail' ? true : false,
                    quality: 0.5,
                    videoExportPreset: ImagePicker.VideoExportPreset.MediumQuality
                });
            }
            else if (type === 'camera') {
                await ImagePicker.requestCameraPermissionsAsync();
                selectedMedia = await ImagePicker.launchCameraAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.All,
                    allowsEditing: false,
                    quality: 0.5,
                    videoExportPreset: ImagePicker.VideoExportPreset.MediumQuality
                });
            }
            if (!selectedMedia.cancelled) {
                setLoading(true);
                if (type === 'thumbnail') {
                    let media = await ImageManipulator.manipulateAsync(selectedMedia.uri, [{ resize: { width: 500 } }], { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG });
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
                else if (['camera', 'file'].includes(type)) {
                    Alert.prompt(`New ${selectedMedia.type} title`, '', async (text) => {
                        setLoading(true);
                        let response = await fetch(selectedMedia.uri);
                        let blob = await response.blob();
                        let filename = `${text}.${selectedMedia.type === 'image' ? 'jpg' : 'mp4'}`;
                        await Storage.put(`${project.id}/${folder ? `${folder.id}/` : ''}${filename}`, blob, { contentType: blob.type, level: 'private' });
                        await API.graphql(graphqlOperation(`mutation {
                            insert_files_one(object: {title: "${filename}", type: "${blob.type}", size: "${blob.size}", order: ${project.files.length}, project_id: "${project.id}"${folder ? `, folder_id: "${folder.id}"` : ''}}) {id}
                        }`));
                        onRefresh();
                    }, 'plain-text');
                }
            }
            setLoading(false);
        } catch (err) {
            setLoading(false);
            console.log(err);
        }
    };

    const addAction = async (type) => {
        if (type === 'entry') {
            navigation.push('entry', { project_id: project.id })
        }
        else if (type === 'task') {
            navigation.push('edit_task', { project_id: project.id })
        }
        else if (type === 'document') {
            const nameFunction = async (text) => {
                setLoading(true);
                let data = await API.graphql(graphqlOperation(`mutation {
                    insert_files_one(object: {title: "${text}", content: "", order: ${project.files.length}, project_id: "${project.id}"${folder ? `, folder_id: "${folder.id}"` : ''}}) {id}
                }`));
                setLoading(false);
                navigation.push('document', { id: data.data.insert_files_one.id });
            }

            if (Platform.OS !== 'web') {
                Alert.prompt('New Document Title', '', async (text) => {
                    await nameFunction(text);
                }, 'plain-text');
            }
            else {
                let text = prompt('New Document Title');
                if (text) {
                    await nameFunction(text);
                }
            }
        }
        else if (type === 'file') {
            let file = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: false, multiple: false });
            if (file.type === 'success') {
                setLoading(true);
                let response = await fetch(file.uri);
                let blob = await response.blob();
                await Storage.put(`${project.id}/${folder ? `${folder.id}/` : ''}${file.name}`, blob, { contentType: blob.type, level: 'private' });
                await API.graphql(graphqlOperation(`mutation {
                    insert_files_one(object: {title: "${file.name}", type: "${blob.type}", size: "${file.size}", order: ${project.files.length}, project_id: "${project.id}"${folder ? `, folder_id: "${folder.id}"` : ''}}) {id}
                }`));
                setLoading(false);
                onRefresh();
            }
        }
        else if (type === 'folder') {
            const addFunction = async (text) => {
                setLoading(true);
                let data = await API.graphql(graphqlOperation(`mutation {
                    insert_files_one(object: {title: "${text}", content: "", order: ${project.files.length}, project_id: "${project.id}", type: "folder"${folder ? `, folder_id: "${folder.id}"` : ''}}) {id}
                }`));
                setLoading(false);
                onRefresh();
            }

            if (Platform.OS !== 'web') {
                Alert.prompt('New Folder Title', '', async (text) => {
                    await addFunction(text);
                }, 'plain-text');
            }
            else {
                let text = prompt('New Folder Title');
                if (text) {
                    await addFunction(text);
                }
            }
        }
        else if (type === 'event') {
            navigation.push('event', { project_id: project.id })
        }
        else if (type === 'image') {
            pickImage('file');
        }
        else if (type === 'camera') {
            pickImage('camera');
        }
        else if (type === 'mobile') {
            let options = ['Cancel', 'Add Folder', 'Add Document', 'Upload from Camera Roll', 'Take Picture/Video', 'Upload File'];
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: options,
                    cancelButtonIndex: 0
                },
                async (buttonIndex) => {
                    if (buttonIndex === options.indexOf('Add Folder')) {
                        addAction('folder');
                    }
                    else if (buttonIndex === options.indexOf('Add Document')) {
                        addAction('document');
                    }
                    else if (buttonIndex === options.indexOf('Upload from Camera Roll')) {
                        addAction('image');
                    }
                    else if (buttonIndex === options.indexOf('Take Picture/Video')) {
                        addAction('camera');
                    }
                    else if (buttonIndex === options.indexOf('Upload File')) {
                        addAction('file');
                    }
                }
            );
        }
    }

    return (
        <View style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: Platform.OS === 'web' ? -30 : 0
        }}>
            <View style={{ maxWidth: window.width, width: '100%', padding: 10, height: '100%', paddingTop: 0 }}>
                {Platform.OS === 'web' && <View style={{ height: 80 }} />}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', width: '90%' }}>
                        <TouchableOpacity style={{ marginRight: 5 }} onPress={() => { navigation.goBack(); }} ><Text style={{ fontSize: 30 }}>←</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => { pickImage(); }}>
                            {project.image ?
                                <Image
                                    style={{ width: Platform.OS === 'web' ? 80 : 60, height: Platform.OS === 'web' ? 80 : 60, marginRight: 10, borderColor: colors.text, borderWidth: 1, borderRadius: 10 }}
                                    source={{ uri: `https://files.productabot.com/public/${project.image}` }}
                                />
                                :
                                <View style={{ width: Platform.OS === 'web' ? 80 : 60, height: Platform.OS === 'web' ? 80 : 60, marginRight: 10, borderColor: colors.text, borderWidth: 1, borderRadius: 10 }} />
                            }
                        </TouchableOpacity>
                        <View style={{ width: window.width - 145 }}>
                            <TextInput placeholderTextColor={colors.placeholder} inputAccessoryViewID='main' spellCheck={false} value={project.name} numberOfLines={1} style={[{ fontSize: 40, color: colors.text }, root.desktopWeb && { outlineWidth: 0 }]}
                                onChangeText={(value) => { setProject({ ...project, name: value }); }}
                                onBlur={async () => {
                                    await API.graphql(graphqlOperation(`mutation {
                                    update_projects_by_pk(pk_columns: {id: "${project.id}"}, _set: {name: "${project.name}"}) {
                                      id
                                    }
                                  }`));
                                }}
                            />
                            <TextInput placeholderTextColor={colors.placeholder} inputAccessoryViewID='main' spellCheck={false} value={project.description} numberOfLines={2} style={[{ fontSize: 20, color: colors.text }, root.desktopWeb && { outlineWidth: 0 }]}
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
                        </View>
                    </View>
                    <TouchableOpacity onPress={() => { setSettings(!settings); }} ><Text style={{ fontSize: 30 }}>⚙️</Text></TouchableOpacity>
                </View>
                {settings ?
                    <View style={{ flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', padding: 10, width: root.desktopWeb ? 600 : '100%', alignSelf: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', alignSelf: 'center', marginBottom: 10, height: 40, width: '100%' }}>
                            <Text style={{ fontSize: 20, color: colors.text, width: '22%', textAlign: 'center' }}>key: </Text>
                            <TextInput placeholderTextColor={colors.placeholder} inputAccessoryViewID='main' spellCheck={false} value={project.key} numberOfLines={2} style={{ backgroundColor: colors.background, color: colors.text, borderWidth: 1, borderColor: '#666666', borderStyle: 'solid', padding: 5, marginTop: 5, marginBottom: 5, fontSize: 20, borderRadius: 10, width: 80 }}
                                onChangeText={(value) => { setProject({ ...project, key: value }); }}
                                onBlur={async () => { await API.graphql(graphqlOperation(`mutation {update_projects_by_pk(pk_columns: {id: "${project.id}"}, _set: {key: "${project.key}"}) {id} }`)); }}
                            />
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', alignSelf: 'center', marginBottom: 10, height: 40, width: '100%' }}>
                            <Text style={{ fontSize: 20, color: colors.text, width: '22%', textAlign: 'center' }}>color: </Text>
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
                                <View style={{ width: 100, height: 40, marginLeft: -5 }}>
                                    <WebView
                                        style={{ backgroundColor: 'transparent' }}
                                        ref={inputRef}
                                        source={{
                                            html: `<head>
                                                <meta name="viewport" content="width=device-width; initial-scale=1.0; maximum-scale=1.0; user-scalable=no;" />
                                                </head>
                                                <body>
                                                <input id="editor" onchange="window.ReactNativeWebView.postMessage(document.querySelector('#editor').value)" type="color" value="${project.color}"/>
                                                </body>
                                            `}}
                                        keyboardDisplayRequiresUserAction={false}
                                        showsHorizontalScrollIndicator={false}
                                        scrollEnabled={false}
                                        scalesPageToFit={false}
                                        javaScriptEnabled={true}
                                        automaticallyAdjustContentInsets={false}
                                        onMessage={async (e) => {
                                            let value = e.nativeEvent.data;
                                            await API.graphql(graphqlOperation(`
                                                mutation {
                                                    update_projects_by_pk(pk_columns: {id: "${project.id}"}, _set: {color: "${value}"}) {
                                                        id
                                                    }
                                                }`));
                                            setProject({ ...project, color: value });
                                        }}
                                    />
                                </View>
                            }
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', alignSelf: 'center', marginBottom: 10, height: 40, width: '100%' }}>
                            <Text style={{ fontSize: 20, color: colors.text, width: '22%', textAlign: 'center' }}>goal:</Text>
                            <TextInput placeholderTextColor={colors.placeholder} inputAccessoryViewID='main' spellCheck={false} value={`${project.goal ? project.goal : ''}`} numberOfLines={2} style={{ backgroundColor: colors.background, color: colors.text, borderWidth: 1, borderColor: '#666666', borderStyle: 'solid', padding: 5, marginTop: 5, marginBottom: 5, fontSize: 20, borderRadius: 10, width: 50 }}
                                onChangeText={(value) => { setProject({ ...project, goal: value }); }}
                                onBlur={async () => {
                                    await API.graphql(graphqlOperation(`
                        mutation {
                            update_projects_by_pk(pk_columns: {id: "${project.id}"}, _set: {goal: "${project.goal}"}) {
                                id
                            }
                        }`));
                                }}
                            />
                            <Text style={{ fontSize: 20, color: colors.text, width: '40%', textAlign: 'left', marginLeft: 10 }}>hours per month</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', alignSelf: 'center', marginBottom: 10, height: 40, width: '100%' }}>
                            <Text style={{ fontSize: 20, color: colors.text, width: '22%', textAlign: 'center' }}>website: </Text>
                            <TextInput placeholderTextColor={colors.placeholder} inputAccessoryViewID='main' spellCheck={false} value={project.website} numberOfLines={2} style={{ backgroundColor: colors.background, color: colors.text, borderWidth: 1, borderColor: '#666666', borderStyle: 'solid', padding: 5, marginTop: 5, marginBottom: 5, fontSize: 20, borderRadius: 10, width: '78%' }}
                                onChangeText={(value) => { setProject({ ...project, website: value }); }}
                                onBlur={async () => {
                                    await API.graphql(graphqlOperation(`
                        mutation {
                            update_projects_by_pk(pk_columns: {id: "${project.id}"}, _set: {website: "${project.website}"}) {
                                id
                            }
                        }`));
                                }}
                            />
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', alignSelf: 'center', marginBottom: 10, height: 40, width: '100%' }}>
                            <Text style={{ fontSize: 20, color: colors.text, width: '22%', textAlign: 'center' }}>public: </Text>
                            <TouchableOpacity onPress={async () => {
                                setProject({ ...project, public: !project.public });
                                await API.graphql(graphqlOperation(`mutation {update_projects_by_pk(pk_columns: {id: "${project.id}"}, _set: {public: ${project.public ? 'false' : 'true'}}) {id}}`));
                            }} style={{ flexDirection: 'row' }}>
                                <View style={{ borderWidth: 1, borderColor: colors.text, borderRadius: 5, height: 20, width: 20, marginRight: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.text, textAlign: 'center', fontWeight: 'bold' }}>{project.public ? '✓' : ''}</Text></View>
                            </TouchableOpacity>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 10, height: 40, width: '100%' }}>
                            <Text onPress={async () => {
                                const archiveFunction = async () => {
                                    setLoading(true);
                                    await API.graphql(graphqlOperation(`mutation {update_projects_by_pk(pk_columns: {id: "${project.id}"}, _set: {archived: true}) {id}}`));
                                    setLoading(false);
                                    navigation.goBack();
                                }
                                if (Platform.OS === 'ios') {
                                    Alert.alert('Warning', 'Are you sure you want to archive this project?', [{ style: 'cancel', text: 'no' }, {
                                        style: 'destructive', text: 'archive', onPress: archiveFunction
                                    }])
                                }
                                else {
                                    if (confirm('Are you sure you want to archive this project?')) {
                                        await archiveFunction();
                                    }
                                }

                            }} style={{ textAlign: 'center', color: colors.text }}>
                                archive project
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 10, height: 40, width: '100%' }}>
                            <Text onPress={async () => {
                                console.log('ahhh!');
                                const deleteFunction = async () => {
                                    setLoading(true);
                                    await API.graphql(graphqlOperation(`mutation {delete_projects_by_pk(id: "${project.id}") {id}}`));
                                    setLoading(false);
                                    navigation.goBack();
                                }
                                if (Platform.OS === 'ios') {
                                    Alert.alert('Warning', 'Are you sure you want to delete this project?', [{ style: 'cancel', text: 'no' }, {
                                        style: 'destructive', text: 'delete', onPress: deleteFunction
                                    }])
                                }
                                else {
                                    if (confirm('Are you sure you want to delete this project?')) {
                                        await deleteFunction();
                                    }
                                }

                            }} style={{ textAlign: 'center', color: '#ff0000' }}>
                                delete project
                            </Text>
                        </View>
                    </View>
                    :
                    <Animated.View style={{ opacity: opacity, width: '100%', height: window.height, marginTop: 10 }}>
                        <>
                            {Platform.OS !== 'web' &&
                                <TouchableOpacity
                                    style={{ position: 'absolute', bottom: 0, right: 10, zIndex: 1, backgroundColor: colors.background, borderWidth: 1, borderStyle: 'solid', borderColor: colors.border, borderRadius: 20, padding: 10, paddingLeft: 20, paddingRight: 20 }}
                                    onPress={async () => {
                                        addAction('mobile')
                                    }}><Text style={{ fontSize: 20 }}>add file +</Text></TouchableOpacity>}
                            <View style={{ flexDirection: 'row', width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
                                <View style={{ flexDirection: 'row', marginLeft: 5, marginBottom: 5 }}>
                                    <Text onPress={() => { setFolder(null) }}>{folder?.title ? `. . 📂 / ` : `📂 / `}</Text>
                                    {folder?.folder?.folder?.folder?.folder && <Text onPress={() => { setFolder(folder.folder.folder.folder.folder) }}>{`📂 ${folder.folder.folder.folder.folder.title} / `}</Text>}
                                    {folder?.folder?.folder?.folder && <Text onPress={() => { setFolder(folder.folder.folder.folder) }}>{`📂 ${folder.folder.folder.folder.title} / `}</Text>}
                                    {folder?.folder?.folder && <Text onPress={() => { setFolder(folder.folder.folder) }}>{`📂 ${folder.folder.folder.title} / `}</Text>}
                                    {folder?.folder && <Text onPress={() => { setFolder(folder.folder) }}>{`📂 ${folder.folder.title} / `}</Text>}
                                    {folder?.title && <Text onPress={() => { }}>📂 {folder?.title}</Text>}
                                </View>
                                {Platform.OS === 'web' ?
                                    <View style={{ flexDirection: 'row' }}>
                                        <TouchableOpacity style={{ width: 'auto', alignSelf: 'flex-end', justifyContent: 'flex-end', alignItems: 'flex-end', marginBottom: 5, marginRight: 20 }}
                                            onPress={async () => { addAction('folder'); }}
                                        ><Text>{'add folder'} +</Text></TouchableOpacity>
                                        <TouchableOpacity style={{ width: 'auto', alignSelf: 'flex-end', justifyContent: 'flex-end', alignItems: 'flex-end', marginBottom: 5, marginRight: 20 }}
                                            onPress={async () => { addAction('document'); }}
                                        ><Text>{'add document'} +</Text></TouchableOpacity>
                                        <TouchableOpacity style={{ width: 'auto', alignSelf: 'flex-end', justifyContent: 'flex-end', alignItems: 'flex-end', marginBottom: 5, marginRight: 10 }}
                                            onPress={async () => { addAction('file'); }}
                                        ><Text>{'upload file'} +</Text></TouchableOpacity>
                                    </View>
                                    :
                                    <View />
                                }
                            </View>
                            <CustomDraggableFlatList
                                data={project.files}
                                virtualHeight={window.height - 240}
                                renderItem={({ item, index }) =>
                                    <>
                                        <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', marginTop: -5, marginBottom: -5 }}>
                                            <Text style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginRight: 7, fontSize: 30 }}>
                                                {item.type === 'folder' ? '📁' : item.type === 'document' ? '📄' : item.type === 'sheet' ? '📈' : item.type.startsWith('image') ? <Image source={{ uri: `https://files.productabot.com/private/${identityId}/${project.id}/${item.title}` }} style={{ borderRadius: 5, marginBottom: -5, width: Platform.OS === 'web' ? 40 : 30, height: Platform.OS === 'web' ? 40 : 30 }} /> : item.type.endsWith('pdf') ? '📃' : item.type.startsWith('video') ? '📹' : item.type.startsWith('audio') ? '🎧' : '💻'}
                                            </Text>
                                            <View style={{ flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', maxWidth: '80%' }}>
                                                <Text style={{ fontSize: 10, color: colors.subtitle, marginBottom: Platform.OS === 'web' ? -3 : 0 }}>{`${['document', 'sheet', 'folder'].includes(item.type) ? item.type : item.type + ' | ' + formatBytes(item.size)}`}</Text>
                                                <Text style={{ fontSize: 22 }}>{item.title}</Text>
                                            </View>
                                            <Text style={{ fontSize: 14, marginLeft: 'auto' }}>☰</Text>
                                        </View>
                                    </>
                                }
                                onPress={async (item) => {
                                    if (item.item.type === 'sheet') {
                                        if (Platform.OS === 'web') {
                                            navigation.push('sheet', { id: item.item.id });
                                        }
                                        else {
                                            alert('Sorry! Sheets are not supported on the mobile app at this time');
                                        }
                                    }
                                    else if (item.item.type === 'document') {
                                        navigation.push('document', { id: item.item.id });
                                    }
                                    else if (item.item.type === 'folder') {
                                        setFolder(item.item);
                                    }
                                    else {
                                        let link = await Storage.get(`${project.id}/${folder ? `${folder.id}/` : ''}${item.item.title}`, { level: 'private', expires: 10 });
                                        link = link.replace('https://pbot-prod-files.s3.us-east-2.amazonaws.com', 'https://files.productabot.com')
                                        await WebBrowser.openBrowserAsync(link);
                                    }
                                }}
                                onMove={async (item) => {
                                    setItemToMove(item.item);
                                    folderRef.current.open()
                                }}
                                onRename={async (item) => {
                                    const renameFunction = async (rename, extension) => {
                                        setLoading(true);
                                        if (rename) {
                                            if (['document', 'sheet', 'folder'].includes(item.item.type)) {
                                                await API.graphql(graphqlOperation(`mutation{update_files_by_pk(pk_columns: {id: "${item.item.id}"}, _set: {title: "${rename}"}) {id}}`));
                                            }
                                            else {
                                                try {
                                                    await Storage.copy({ key: `${project.id}/${item.item.folder ? item.item.folder.id + '/' : ''}${item.item.title}`, level: 'private' }, { key: `${project.id}/${folder ? folder.id + '/' : ''}${rename}${extension}`, level: 'private' });
                                                    await Storage.remove(`${project.id}/${item.item.folder ? item.item.folder.id + '/' : ''}${item.item.title}`, { level: 'private' });
                                                    await API.graphql(graphqlOperation(`mutation{update_files_by_pk(pk_columns: {id: "${item.item.id}"}, _set: {title: "${rename}${extension}"}) {id}}`));
                                                }
                                                catch (err) {
                                                    console.log(err);
                                                }
                                            }
                                        }
                                        await onRefresh();
                                        setLoading(false);
                                    }


                                    let originalName = item.item.title;
                                    let extension = '';
                                    if (['document', 'sheet', 'folder'].includes(item.item.type)) {
                                        let nameSplit = item.item.title.split('.');
                                        if (nameSplit.length > 0) {
                                            originalName = nameSplit[0];
                                            extension = '.' + nameSplit[1];
                                        }
                                    }
                                    if (Platform.OS !== 'web') {
                                        Alert.prompt('Rename', '', async (text) => {
                                            await renameFunction(text, extension);
                                        }, 'plain-text', originalName);
                                    }
                                    else {
                                        let rename = prompt('Rename', originalName);
                                        await renameFunction(rename, extension);
                                    }
                                }}
                                onDelete={async (item) => {
                                    const deleteFunction = async () => {
                                        if (['sheet', 'document', 'folder'].includes(item.item.type)) {
                                            setLoading(true);
                                            await API.graphql(graphqlOperation(`mutation {delete_files_by_pk(id: "${item.item.id}") {id}}`));
                                            await onRefresh();
                                            setLoading(false);
                                        }
                                        else {

                                            try {
                                                await Storage.remove(`${project.id}/${item.item.name}`, { level: 'private' });
                                                await API.graphql(graphqlOperation(`mutation {delete_files_by_pk(id: "${item.item.id}") {id}}`));
                                                await onRefresh();
                                            }
                                            catch (err) {
                                                console.log(err);
                                            }
                                        }
                                    }
                                    if (Platform.OS !== 'web') {
                                        Alert.alert('Warning', `Are you sure you want to delete this ${item.item.type}?`,
                                            [{ text: "No", style: "cancel" }, { text: "Yes", style: "destructive", onPress: async () => { await deleteFunction(); } }]);
                                    }
                                    else if (confirm(`Are you sure you want to delete this ${item.item.type}?`)) { await deleteFunction() }
                                }}
                                setContextPosition={setContextPosition}
                                menuRef={menuRef}
                                ListEmptyComponent={
                                    <TouchableOpacity
                                        onPress={async () => { addAction('mobile'); }}
                                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, margin: 10, borderRadius: 10, backgroundColor: colors.card }}>
                                        <Text style={{ fontSize: 14, width: '100%', textAlign: 'center' }}>{`add/upload +`}</Text>
                                    </TouchableOpacity>}
                                onDragEnd={async ({ data }) => {
                                    setProject({ ...project, files: data });
                                    await API.graphql(graphqlOperation(`mutation {
                                    ${data.map((document, documentIndex) => `data${documentIndex}: update_files_by_pk(pk_columns: {id: "${document.id}"}, _set: {order: ${data.length - 1 - documentIndex}}) {id}`)}
                                }`));
                                }}
                                ListFooterComponent={<View style={{ height: 100 }} />}
                            />
                        </>
                    </Animated.View>}
            </View >
            <InputAccessoryViewComponent />
            <Menu style={{ position: 'absolute', left: 0, top: 0 }} ref={menuRef} renderer={ContextMenuRenderer} >
                <MenuTrigger customStyles={{ triggerOuterWrapper: { top: contextPosition.y, left: contextPosition.x } }} />
                <MenuOptions style={{ flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', backgroundColor: colors.background, borderColor: colors.text, borderWidth: 1, borderStyle: 'solid', borderRadius: 10, width: contextPosition.fileContextMenu ? 140 : 100, paddingLeft: 15, paddingTop: 5, paddingBottom: 5 }}>
                    {contextPosition.move && <TouchableOpacity style={{ padding: 5, width: '100%' }} onPress={async () => {
                        menuRef.current.close();
                        await contextPosition.move();
                        await onRefresh();
                    }} ><Text style={{ color: colors.text }}>Move</Text></TouchableOpacity>}
                    {contextPosition.rename && <TouchableOpacity style={{ padding: 5, width: '100%' }} onPress={async () => {
                        menuRef.current.close();
                        await contextPosition.rename();
                        await onRefresh();
                    }} ><Text style={{ color: colors.text }}>Rename</Text></TouchableOpacity>}
                    {contextPosition.delete && <TouchableOpacity style={{ padding: 5, width: '100%' }} onPress={async () => {
                        menuRef.current.close();
                        await contextPosition.delete();
                        await onRefresh();
                    }}><Text style={{ color: colors.delete }}>Delete</Text></TouchableOpacity>}
                    {contextPosition.fileContextMenu &&
                        <>
                            {folder && <TouchableOpacity style={{ padding: 5, width: '100%' }} onPress={async () => {
                                menuRef.current.close();
                                setFolder(folder?.folder ? folder?.folder : null);
                            }}><Text style={{ color: colors.text }}>← Go Back</Text></TouchableOpacity>}
                            <TouchableOpacity style={{ padding: 5, width: '100%' }} onPress={async () => {
                                menuRef.current.close();
                                addAction('folder');
                            }}><Text style={{ color: colors.text }}>Add Folder</Text></TouchableOpacity>
                            <TouchableOpacity style={{ padding: 5, width: '100%' }} onPress={async () => {
                                menuRef.current.close();
                                addAction('document');
                            }}><Text style={{ color: colors.text }}>Add Document</Text></TouchableOpacity>
                            <TouchableOpacity style={{ padding: 5, width: '100%' }} onPress={async () => {
                                menuRef.current.close();
                                addAction('file');
                            }}><Text style={{ color: colors.text }}>Upload File</Text></TouchableOpacity>
                        </>
                    }
                    <TouchableOpacity style={{ padding: 5, width: '100%' }}
                        onPress={() => { menuRef.current.close(); }}><Text style={{ color: colors.text }}>Cancel</Text></TouchableOpacity>
                </MenuOptions>
            </Menu>
            <Menu style={{ position: 'absolute', left: 0, top: 0, }} ref={folderRef} renderer={ContextMenuRenderer} >
                <MenuTrigger customStyles={{ triggerOuterWrapper: Platform.OS === 'web' ? { left: (window.width - 400) / 2, top: (window.height - 300) / 2 } : { left: window.width * 0.1, top: window.height * 0.1 } }} />
                <MenuOptions style={{ flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', backgroundColor: colors.background, borderColor: colors.text, borderWidth: 1, borderStyle: 'solid', borderRadius: 10, width: Platform.OS === 'web' ? 400 : window.width * 0.8, height: Platform.OS === 'web' ? 300 : window.height * 0.6, paddingLeft: 15, paddingTop: 5, paddingBottom: 5 }}>
                    <FlatList
                        style={{ width: '100%', height: '100%' }}
                        data={[{ id: null, title: '' }, ...project?.folders.filter(obj =>
                            obj.id !== itemToMove?.id &&
                            obj.folder?.id !== itemToMove?.id &&
                            obj.folder?.folder?.id !== itemToMove?.id &&
                            obj.folder?.folder?.folder?.id !== itemToMove?.id &&
                            obj.folder?.folder?.folder?.folder?.id !== itemToMove?.id &&
                            obj.folder?.folder?.folder?.folder?.folder?.id !== itemToMove?.id &&
                            true
                        )]}
                        ListHeaderComponent={() =>
                            <View style={{ backgroundColor: colors.background, width: '100%', height: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ color: colors.text, padding: 10, backgroundColor: colors.background }}>select a folder</Text>
                                <TouchableOpacity onPress={() => { folderRef.current.close(); }} style={{ backgroundColor: '#efefef', borderRadius: 10, paddingLeft: 10, paddingRight: 10, paddingTop: 2, paddingBottom: 2, marginRight: 10 }}>
                                    <Text style={{ color: '#000000', textAlign: 'center' }}>cancel</Text>
                                </TouchableOpacity>
                            </View>
                        }
                        stickyHeaderIndices={[0]}
                        renderItem={({ item }) =>
                            <TouchableOpacity
                                key={item.id ?? 'rootFolder'}
                                onPress={async () => {
                                    setLoading(true);
                                    await API.graphql(graphqlOperation(`mutation{update_files_by_pk(pk_columns: {id: "${itemToMove.id}"}, _set: {folder_id: ${item.id ? `"${item.id}"` : `null`}}) {id}}`));

                                    if (!['document', 'sheet', 'folder'].includes(itemToMove.type)) {
                                        try {
                                            console.log(`${project.id}/${itemToMove.folder ? itemToMove.folder.id + '/' : ''}${itemToMove.title}`);
                                            console.log(`${project.id}/${folder ? folder.id + '/' : ''}${itemToMove.title}`);
                                            await Storage.copy({ key: `${project.id}/${itemToMove.folder ? itemToMove.folder.id + '/' : ''}${itemToMove.title}`, level: 'private' }, { key: `${project.id}/${item ? item.id + '/' : ''}${itemToMove.title}`, level: 'private' });
                                            await Storage.remove(`${project.id}/${itemToMove.folder ? itemToMove.folder.id + '/' : ''}${itemToMove.title}`, { level: 'private' });
                                        }
                                        catch (err) {
                                            console.log(err);
                                        }
                                    }

                                    setLoading(false);
                                    onRefresh();
                                    folderRef.current.close();
                                }}>
                                <Text style={{ color: colors.text, margin: 20 }}>
                                    {`📁 / ${item?.folder?.folder?.folder?.folder?.folder ? `${item?.folder?.folder?.folder?.folder?.folder.title} / ` : ''}${item?.folder?.folder?.folder?.folder ? `${item?.folder?.folder?.folder?.folder.title} / ` : ''}${item?.folder?.folder?.folder ? `${item?.folder?.folder?.folder.title} / ` : ''}${item?.folder?.folder ? `${item?.folder?.folder.title} / ` : ''}${item.folder ? `${item.folder.title} / ` : ''}${item.title}`}
                                </Text>
                            </TouchableOpacity>
                        }
                    />
                </MenuOptions>
            </Menu>
        </View>
    );
}

const styles = StyleSheet.create({
    picker: { backgroundColor: '#000000', color: '#ffffff', borderWidth: 1, borderColor: '#ffffff', borderStyle: 'solid', padding: 5, marginTop: 5, marginBottom: 5, fontSize: 20 }
});