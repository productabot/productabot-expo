import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, FlatList, RefreshControl, ScrollView, TextInput, Platform, Keyboard, Alert, useWindowDimensions, Image } from 'react-native';
import { Text, View } from '../components/Themed';
import { API, graphqlOperation } from "@aws-amplify/api";
import { LoadingComponent } from '../components/LoadingComponent';
import * as root from '../Root';
import RNPickerSelect from 'react-native-picker-select';
import { InputAccessoryViewComponent } from '../components/InputAccessoryViewComponent';
import { WebView } from 'react-native-webview';
import { useTheme } from '@react-navigation/native';
import InputComponent from '../components/InputComponent';

export default function TaskScreen({ route, navigation, refresh, setLoading }: any) {
    const window = useWindowDimensions();
    const [projects, setProjects] = useState([]);
    const [dates, setDates] = useState([]);
    const [task, setTask] = useState({
        date: '',
        project: null,
        category: null,
        details: null,
        status: 'backlog',
        priority: 'low'
    });
    const [refreshControl, setRefreshControl] = useState(false);
    const inputRef = useRef(null);
    const { colors } = useTheme();
    const styles = makeStyles(colors);

    useEffect(() => {
        if (!route.params) { route.params = {}; }
        onRefresh();
    }, [refresh]);

    let onRefresh = async (showRefreshControl = false) => {
        showRefreshControl ? setRefreshControl(true) : setLoading(true);

        //create an array of dates
        let dates = [];
        for (let i = -20; i < 40; i++) {
            let date = new Date();
            date.setDate(date.getDate() + i);
            dates.push({ label: date.toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), value: await root.exportDate(date) });
        }
        //get all projects
        let projectsData = await API.graphql(graphqlOperation(`{
            projects(order_by: {name: asc}, where: {archived: {_eq: false}}) {
              id
              name
              image
            }
          }
          `));

        //check if the user has any projects
        if (projectsData.data.projects.length === 0) {
            alert('You must add a project before adding a task');
            navigation.goBack();
        }

        //load existing task if editing
        let task = {};
        let lastProject = null;
        if (route.params.id) {
            let data = await API.graphql(graphqlOperation(`{
                    tasks_by_pk(id: "${route.params.id}") {
                      id
                      project_id
                      date
                      category
                      details
                      status
                      priority
                    }
                  }
                  `));
            task = data.data.tasks_by_pk;
        }
        else {
            //preselect last project you entered time for, if it exists
            let data = await API.graphql(graphqlOperation(`{
                tasks(limit: 1, order_by: {created_at: desc}) {
                  project_id
                }
              }`));
            lastProject = data.data.tasks[0]?.project_id ?? '';
        }

        setTask({
            project: route.params.id ? task.project_id : route.params.project_id ? route.params.project_id : lastProject ? lastProject : projectsData.data.projects.length !== 0 ? projectsData.data.projects[0].id : null,
            date: route.params.id ? task.date : route.params.date ? await root.exportDate(new Date(route.params.date), 1) : null,
            category: route.params.id ? task.category : null,
            details: route.params.id ? task.details : null,
            status: route.params.id ? task.status : route.params.status ? route.params.status : 'backlog',
            priority: route.params.id ? task.priority : 'low',
        });
        setProjects(projectsData.data.projects);
        setDates(dates);
        showRefreshControl ? setRefreshControl(false) : setLoading(false);
    }

    const submit = async () => {
        Keyboard.dismiss();
        setLoading(true);
        try {
            let response = await API.graphql(graphqlOperation(route.params.id
                ?
                `            
                mutation($project_id: uuid, $date: date, $details: String, $category: String, $status: String, $priority: String) {
                    update_tasks_by_pk(pk_columns: {id: "${route.params.id}"}, _set: {date: $date, details: $details, project_id: $project_id, category: $category, status: $status, priority: $priority}) {id}
                }
                `
                :
                `
                mutation($project_id: uuid, $date: date, $details: String, $category: String, $status: String, $priority: String) {
                    insert_tasks_one(object: {project_id: $project_id, date: $date, details: $details, category: $category, status: $status, priority: $priority, root_order: 10000 }) {id}
                }
              `, { project_id: task.project, date: ['', null].includes(task.date) ? null : task.date, details: task.details, category: task.category, status: task.status, priority: task.priority }));
            console.log(response);
            setTask({ details: null, category: null, date: dates[20].value, project: projects[0].value, status: 'backlog', priority: 'low' });
            setLoading(false);
            navigation.goBack();
        }
        catch (err) {
            setTask({ details: null, category: null, date: dates[20].value, project: projects[0].value, status: 'backlog', priority: 'low' });
            setLoading(false);
            console.log(err);
        }
    }

    return (
        <View style={styles.container}>
            {root.desktopWeb ?
                <View style={{ height: 50 }} />
                :
                <View style={{ padding: 10, paddingBottom: 0, paddingTop: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <TouchableOpacity onPress={() => { navigation.goBack(); }} ><Text style={{ fontSize: 30 }}>←</Text></TouchableOpacity>
                    <Text>{route.params.id ? 'edit task' : 'add task'}</Text>
                    <Text style={{ fontSize: 30, opacity: 0 }}>←</Text>
                </View>}
            <ScrollView
                style={{ maxWidth: 890, width: '100%', height: '100%', padding: 10, overflow: 'visible' }}
                contentContainerStyle={{ display: 'flex', alignItems: 'center' }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshControl}
                        onRefresh={() => { onRefresh(true) }}
                        colors={[colors.text]}
                        tintColor={colors.text}
                        titleColor={colors.text}
                        title=""
                    />}
                keyboardShouldPersistTaps="always"
            >
                {Platform.OS === 'web' && <TouchableOpacity style={{ alignSelf: 'flex-start', marginLeft: -40, marginBottom: -40 }} onPress={() => { navigation.goBack(); }} ><Text style={{ fontSize: 30 }}>←</Text></TouchableOpacity>}
                <InputComponent type="select" value={task.project} options={projects} optionImage={true} setValue={(value) => { setTask({ ...task, project: value }) }} />
                <InputComponent type="date" value={task.date} setValue={(value) => { setTask({ ...task, date: value }) }} canClear={true} initialValue={new Date().toISOString().split('T')[0]} />
                <InputComponent type="select" value={task.status} options={[
                    { id: 'backlog', name: 'backlog' },
                    { id: 'selected', name: 'selected' },
                    { id: 'in_progress', name: 'in progress' },
                    { id: 'done', name: 'done' },
                ]} optionCharacterImage={true} setValue={(value) => { setTask({ ...task, status: value }) }} />
                <InputComponent type="select" value={task.priority} options={[
                    { id: 'low', name: 'low priority' },
                    { id: 'medium', name: 'medium priority' },
                    { id: 'high', name: 'high priority' },
                ]} optionCharacterImage={true} setValue={(value) => { setTask({ ...task, priority: value }) }} />
                <TextInput placeholderTextColor={colors.placeholder} inputAccessoryViewID='main' spellCheck={false} value={task.category} keyboardType='default' onChangeText={value => { setTask({ ...task, category: value }) }} placeholder='category' style={[styles.textInput]} />
                <TextInput placeholderTextColor={colors.placeholder} inputAccessoryViewID='main' spellCheck={false} value={task.details} multiline={true} textAlignVertical={'top'} keyboardType='default' onChangeText={value => { setTask({ ...task, details: value }) }} placeholder='details' style={[styles.textInput, { height: 200 }]} />
                <View style={{ flexDirection: 'row', marginTop: 10, justifyContent: 'center', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => { navigation.goBack(); }} style={{ marginRight: 20 }}><Text style={{ textAlign: 'center' }}>cancel</Text></TouchableOpacity>
                    <TouchableOpacity onPress={submit} style={{ borderRadius: 10, padding: 10, width: 150, backgroundColor: '#3F0054', marginRight: -20 }}><Text style={{ color: '#ffffff', textAlign: 'center' }}>{route.params.id ? `save` : `add`}</Text></TouchableOpacity>
                </View>
                {route.params.id && <Text style={{ color: '#ff0000', marginTop: 40 }} onPress={async () => { if (confirm('Are you sure you want to delete this task?')) { await API.graphql(graphqlOperation(`mutation {delete_tasks_by_pk(id: "${route.params.id}") {id}}`)); navigation.push('tasks'); } }}>delete task</Text>}
            </ScrollView>
            <InputAccessoryViewComponent />
        </View >
    );
}

const isWeb = Platform.OS === 'web';
function s(number: number, factor = 0.6) {
    return isWeb ? number * factor : number;
}
const makeStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center'
    },
    baseText: {
        fontFamily: 'Arial',
        color: colors.text
    },
    touchableOpacity: {
        backgroundColor: '#3F0054',
        padding: s(10),
        width: 275,
        alignItems: 'center',
        margin: s(10),
        borderRadius: 10
    },
    buttonText: {
        fontSize: s(30)
    },
    textInput: { backgroundColor: colors.background, color: colors.text, borderWidth: 1, borderColor: '#666666', borderStyle: 'solid', padding: 5, marginTop: 5, marginBottom: 5, fontSize: 20, width: '100%', borderRadius: 10 },
    picker: { backgroundColor: colors.background, color: colors.text, borderWidth: 1, borderColor: '#666666', borderStyle: 'solid', padding: 5, marginTop: 5, marginBottom: 5, fontSize: 20, borderRadius: 10, paddingLeft: 35 }
});
