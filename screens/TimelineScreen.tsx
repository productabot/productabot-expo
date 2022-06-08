import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, RefreshControl, ScrollView, TextInput, Platform, Keyboard, Image } from 'react-native';
import { Text, View } from '../components/Themed';
import { API, graphqlOperation } from "@aws-amplify/api";
import * as root from '../Root';
import RNPickerSelect from 'react-native-picker-select';
import { InputAccessoryViewComponent } from '../components/InputAccessoryViewComponent';
import { WebView } from 'react-native-webview';
import { useTheme } from '@react-navigation/native';
import InputComponent from '../components/InputComponent';

export default function TimelineScreen({ route, navigation, refresh, setLoading }: any) {
    const [projects, setProjects] = useState([]);
    const [dates, setDates] = useState([]);
    const [timeline, setTimeline] = useState({
        date_from: null,
        date_to: null,
        project: null,
        category: null,
        details: null
    });
    const [refreshControl, setRefreshControl] = useState(false);
    const [webViewLag, setWebViewLag] = useState('none');
    const [uri, setUri] = useState('https://productabot.com/blank.png');
    const inputRef = useRef(null);
    const { colors } = useTheme();
    const styles = makeStyles(colors);

    useEffect(() => {
        if (!route.params) { route.params = {}; }
        onRefresh();
        setTimeout(() => { setWebViewLag('relative') }, 100);
    }, [refresh]);

    useEffect(() => {
        if (timeline.project) {
            setUri(`https://files.productabot.com/public/${projects.filter(obj => obj.value === timeline.project)[0]?.image}`);
        }
    }, [timeline]);

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
        let projects = await API.graphql(graphqlOperation(`{
            projects(order_by: {name: asc}, where: {archived: {_eq: false}}) {
              id
              name
              image
            }
          }
          `));

        //check if the user has any projects
        if (projects.data.projects.length === 0) {
            alert('You must add a project before adding an timeline');
            navigation.goBack();
        }

        //load existing timeline if editing
        let timeline = {};
        let lastProject = null;
        if (route.params.id) {
            let data = await API.graphql(graphqlOperation(`{
                    timelines_by_pk(id: "${route.params.id}") {
                      id
                      project_id
                      date_from
                      date_to
                      category
                      details
                    }
                  }
                  `));
            timeline = data.data.timelines_by_pk;
        }
        else {
            //preselect last project you entered time for, if it exists
            let data = await API.graphql(graphqlOperation(`{
                timelines(limit: 1, order_by: {created_at: desc}) {
                  project_id
                }
              }`));
            lastProject = data.data.timelines[0]?.project_id;
        }

        setTimeline({
            project: route.params.id ? timeline.project_id : route.params.project_id ? route.params.project_id : lastProject ? lastProject : projects.data.projects.length !== 0 ? projects.data.projects[0].id : null,
            date_from: route.params.id ? timeline.date_from : route.params.date_from ? await root.exportDate(new Date(route.params.date_from), 1) : dates[20].value,
            date_to: route.params.id ? timeline.date_to : route.params.date_to ? await root.exportDate(new Date(route.params.date_to), 1) : dates[40].value,
            category: route.params.id ? timeline.category : null,
            details: route.params.id ? timeline.details : null
        });
        setProjects(projects.data.projects);
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
                mutation($project_id: uuid, $date_from: date, $date_to: date, $details: String, $category: String) {
                    update_timelines_by_pk(pk_columns: {id: "${route.params.id}"}, _set: { date_from: $date_from, date_to: $date_to, details: $details, project_id: $project_id, category: $category}) {id}
                }
                `
                :
                `
                mutation($project_id: uuid, $date_from: date, $date_to: date, $details: String, $category: String) {
                    insert_timelines_one(object: {project_id: $project_id,  date_from: $date_from, date_to: $date_to, details: $details, category: $category }) {id}
                }
              `, { project_id: timeline.project, date_from: timeline.date_from, date_to: timeline.date_to, details: timeline.details, category: timeline.category }));
            console.log(response);
            setTimeline({ details: null, category: null, date_from: dates[20].value, date_to: dates[20].value, project: projects[0].value });
            setLoading(false);
            navigation.goBack();
        }
        catch (err) {
            setTimeline({ details: null, date_from: dates[20].value, date_to: dates[20].value, project: projects[0].value });
            setLoading(false);
            console.log(err);
        }
    }

    return (
        <View style={styles.container}>
            {root.desktopWeb ?
                <View style={{ height: 50 }} />
                :
                <View style={{ padding: 10, paddingBottom: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <TouchableOpacity onPress={() => { navigation.goBack(); }} ><Text style={{ fontSize: 30 }}>←</Text></TouchableOpacity>
                    <Text>{route.params.id ? 'edit timeline' : 'add timeline'}</Text>
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

                <InputComponent type="select" value={timeline.project} options={projects} optionImage={true} setValue={(value) => { setTimeline({ ...timeline, project: value }) }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
                    <InputComponent width={Platform.OS === 'web' ? '45%' : '40%'} type="date" value={timeline.date_from} setValue={(value) => { setTimeline({ ...timeline, date_from: value }) }} />
                    <Text style={{ width: '4%', textAlign: 'center', marginTop: Platform.OS === 'web' ? 15 : 10 }}>-</Text>
                    <InputComponent width={Platform.OS === 'web' ? '45%' : '40%'} type="date" value={timeline.date_to} setValue={(value) => { setTimeline({ ...timeline, date_to: value }) }} />
                </View>
                <TextInput placeholderTextColor={colors.placeholder} inputAccessoryViewID='main' spellCheck={false} value={timeline.category} keyboardType='default' onChangeText={value => { setTimeline({ ...timeline, category: value }) }} placeholder='category' style={[styles.textInput]} />
                <TextInput placeholderTextColor={colors.placeholder} inputAccessoryViewID='main' spellCheck={false} value={timeline.details} multiline={true} textAlignVertical={'top'} keyboardType='default' onChangeText={value => { setTimeline({ ...timeline, details: value }) }} placeholder='details' style={[styles.textInput, { height: 200 }]} />

                <View style={{ flexDirection: 'row', marginTop: 10, justifyContent: 'center', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => { navigation.goBack(); }} style={{ marginRight: 20 }}><Text style={{ textAlign: 'center' }}>cancel</Text></TouchableOpacity>
                    <TouchableOpacity onPress={submit} style={{ borderRadius: 10, padding: 10, width: 150, backgroundColor: '#3F0054', marginRight: -20 }}><Text style={{ color: '#ffffff', textAlign: 'center' }}>{route.params.id ? `save` : `add`}</Text></TouchableOpacity>
                </View>

                {route.params.id && <Text style={{ color: '#ff0000', marginTop: 40 }} onPress={async () => { if (confirm('Are you sure you want to delete this timeline?')) { await API.graphql(graphqlOperation(`mutation {delete_timelines_by_pk(id: "${route.params.id}") {id}}`)); navigation.push('timelines'); } }}>delete timeline</Text>}
            </ScrollView>
            <InputAccessoryViewComponent />
        </View>
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
