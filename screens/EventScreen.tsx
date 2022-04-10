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

export default function EventScreen({ route, navigation, refresh, setLoading }: any) {
    const [projects, setProjects] = useState([]);
    const [dates, setDates] = useState([]);
    const [event, setEvent] = useState({
        date_from: new Date(),
        date_to: new Date(),
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
        if (event.project) {
            setUri(`https://files.productabot.com/public/${projects.filter(obj => obj.value === event.project)[0]?.image}`);
        }
    }, [event]);

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
            alert('You must add a project before adding a time event');
            navigation.push('projectsTab');
        }

        //load existing event if editing
        let event = {};
        let lastProject = null;
        if (route.params.id) {
            let data = await API.graphql(graphqlOperation(`{
                    events_by_pk(id: "${route.params.id}") {
                      id
                      project_id
                      date_from
                      date_to
                      category
                      details
                    }
                  }
                  `));
            event = data.data.events_by_pk;
        }
        else {
            //preselect last project you entered time for, if it exists
            let data = await API.graphql(graphqlOperation(`{
                events(limit: 1, order_by: {created_at: desc}) {
                  project_id
                }
              }`));
            lastProject = data.data.events[0]?.project_id;
        }

        setEvent({
            project: route.params.id ? event.project_id : route.params.project_id ? route.params.project_id : lastProject ? lastProject : projects.data.projects.length !== 0 ? projects.data.projects[0].id : null,
            date_from: route.params.id ? event.date_from : route.params.date_from ? await root.exportDate(new Date(route.params.date_from), 1) : dates[20].value,
            date_to: route.params.id ? event.date_to : route.params.date_to ? await root.exportDate(new Date(route.params.date_to), 1) : dates[20].value,
            category: route.params.id ? event.category : null,
            details: route.params.id ? event.details : null
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
                    update_events_by_pk(pk_columns: {id: "${route.params.id}"}, _set: { date_from: $date_from, date_to: $date_to, details: $details, project_id: $project_id, category: $category}) {id}
                }
                `
                :
                `
                mutation($project_id: uuid, $date_from: date, $date_to: date, $details: String, $category: String) {
                    insert_events_one(object: {project_id: $project_id,  date_from: $date_from, date_to: $date_to, details: $details, category: $category }) {id}
                }
              `, { project_id: event.project, date_from: event.date_from, date_to: event.date_to, details: event.details, category: event.category }));
            console.log(response);
            setEvent({ details: null, category: null, date_from: dates[20].value, date_to: dates[20].value, project: projects[0].value });
            setLoading(false);
            navigation.goBack();
        }
        catch (err) {
            setEvent({ details: null, date_from: dates[20].value, date_to: dates[20].value, project: projects[0].value });
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
                    <Text>{route.params.id ? 'edit event' : 'add event'}</Text>
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

                <InputComponent type="select" value={event.project} options={projects} optionImage={true} setValue={(value) => { setEvent({ ...event, project: value }) }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
                    <InputComponent width='45%' type="date" value={event.date_from} setValue={(value) => { setEvent({ ...event, date_from: value }) }} />
                    <Text style={{ width: '10%', textAlign: 'center', marginTop: Platform.OS === 'web' ? 15 : 10 }}>to</Text>
                    <InputComponent width='45%' type="date" value={event.date_to} setValue={(value) => { setEvent({ ...event, date_to: value }) }} />
                </View>
                <TextInput inputAccessoryViewID='main' spellCheck={false} value={event.category} keyboardType='default' onChangeText={value => { setEvent({ ...event, category: value }) }} placeholder='category' style={[styles.textInput]} />
                <TextInput inputAccessoryViewID='main' spellCheck={false} value={event.details} multiline={true} textAlignVertical={'top'} keyboardType='default' onChangeText={value => { setEvent({ ...event, details: value }) }} placeholder='details' style={[styles.textInput, { height: 200 }]} />

                <View style={{ flexDirection: 'row', marginTop: 10, justifyContent: 'center', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => { navigation.goBack(); }} style={{ marginRight: 20 }}><Text style={{ textAlign: 'center' }}>cancel</Text></TouchableOpacity>
                    <TouchableOpacity onPress={submit} style={{ borderRadius: 10, padding: 10, width: 150, backgroundColor: '#3F0054', marginRight: -20 }}><Text style={{ color: '#ffffff', textAlign: 'center' }}>{route.params.id ? `save` : `add`}</Text></TouchableOpacity>
                </View>
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
