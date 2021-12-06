import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, FlatList, RefreshControl, ScrollView, TextInput, Platform, Keyboard, Alert, useWindowDimensions, Image } from 'react-native';
import { Text, View } from '../components/Themed';
import { API, graphqlOperation } from "@aws-amplify/api";
import { LoadingComponent } from '../components/LoadingComponent';
import * as root from '../Root';
import RNPickerSelect from 'react-native-picker-select';
import { InputAccessoryViewComponent } from '../components/InputAccessoryViewComponent';
import { WebView } from 'react-native-webview';

export default function EntryScreen({ route, navigation, refresh, setLoading }: any) {
    const window = useWindowDimensions();
    const [projects, setProjects] = useState([]);
    const [dates, setDates] = useState([]);
    const [timesheet, setTimesheet] = useState({
        date: new Date(),
        project: null,
        category: null,
        hours: null,
        details: null
    });
    const [refreshControl, setRefreshControl] = useState(false);
    const [webViewLag, setWebViewLag] = useState('none');
    const [githubCommits, setGithubCommits] = useState([]);
    const [uri, setUri] = useState('https://productabot.com/blank.png');
    const inputRef = useRef(null);

    useEffect(() => {
        if (!route.params) { route.params = {}; }
        onRefresh();
        setTimeout(() => { setWebViewLag('relative') }, 100);
    }, [refresh]);

    useEffect(() => {
        if (timesheet.project) {
            setUri(`https://files.productabot.com/public/${projects.filter(obj => obj.value === timesheet.project)[0]?.image}`);
        }
    }, [timesheet]);

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
            alert('You must add a project before adding a time entry');
            navigation.navigate('projectsTab');
        }

        //load existing timesheet if editing
        let timesheet = {};
        let lastProject = null;
        if (route.params.id) {
            let data = await API.graphql(graphqlOperation(`{
                    entries_by_pk(id: "${route.params.id}") {
                      id
                      project_id
                      date
                      category
                      hours
                      details
                    }
                  }
                  `));
            timesheet = data.data.entries_by_pk;
        }
        else {
            //preselect last project you entered time for, if it exists
            let data = await API.graphql(graphqlOperation(`{
                entries(limit: 1, order_by: {date_created: desc}) {
                  project_id
                }
              }`));
            lastProject = data.data.entries[0]?.project_id;
        }

        setTimesheet({
            project: route.params.id ? timesheet.project_id : route.params.project_id ? route.params.project_id : lastProject ? lastProject : projects.data.projects.length !== 0 ? projects.data.projects[0].id : null,
            date: route.params.id ? timesheet.date : route.params.date ? await root.exportDate(new Date(route.params.date), 1) : dates[20].value,
            category: route.params.id ? timesheet.category : null,
            hours: route.params.id ? timesheet.hours.toString() : null,
            details: route.params.id ? timesheet.details : null
        });
        setProjects(projects.data.projects.map(obj => { return ({ label: obj.name, value: obj.id, image: obj.image }) }));
        setDates(dates);
        showRefreshControl ? setRefreshControl(false) : setLoading(false);
    }

    const pullGithubCommits = async () => {

        try {
            setLoading(true);
            let data = await API.get('1', '/auth/github/commits', {});
            setGithubCommits(data);
            setLoading(false);
        }
        catch (err) {
            Alert.alert('There was an error pulling commits from GitHub');
            setLoading(false);
        }
    }

    const submit = async () => {
        Keyboard.dismiss();
        setLoading(true);
        try {
            let response = await API.graphql(graphqlOperation(route.params.id
                ?
                `            
                mutation($project_id: uuid, $date: date, $hours: numeric, $details: String, $category: String) {
                    update_entries_by_pk(pk_columns: {id: "${route.params.id}"}, _set: {date: $date, hours: $hours, details: $details, project_id: $project_id, category: $category}) {id}
                }
                `
                :
                `
                mutation($project_id: uuid, $date: date, $hours: numeric, $details: String, $category: String) {
                    insert_entries_one(object: {project_id: $project_id, date: $date, hours: $hours, details: $details, category: $category }) {id}
                }
              `, { project_id: timesheet.project, date: timesheet.date, hours: parseFloat(timesheet.hours).toFixed(2), details: timesheet.details, category: timesheet.category }));
            console.log(response);
            setTimesheet({ hours: null, details: null, category: null, date: dates[20].value, project: projects[0].value });
            setLoading(false);
            navigation.goBack();
        }
        catch (err) {
            setTimesheet({ hours: null, details: null, date: dates[20].value, project: projects[0].value });
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
                    <Text>{route.params.id ? 'edit entry' : 'add entry'}</Text>
                    <Text style={{ fontSize: 30, opacity: 0 }}>←</Text>
                </View>}
            <ScrollView
                style={{ maxWidth: 600, width: '100%', height: '100%', padding: 10, overflow: 'visible' }}
                contentContainerStyle={{ display: 'flex', alignItems: 'center' }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshControl}
                        onRefresh={() => { onRefresh(true) }}
                        colors={["#ffffff"]}
                        tintColor='#ffffff'
                        titleColor="#ffffff"
                        title=""
                    />}
                keyboardShouldPersistTaps="always"
            >
                {Platform.OS === 'web' && <TouchableOpacity style={{ alignSelf: 'flex-start', marginLeft: -40, marginBottom: -40 }} onPress={() => { navigation.goBack(); }} ><Text style={{ fontSize: 30 }}>←</Text></TouchableOpacity>}
                <RNPickerSelect
                    placeholder={{}}
                    Icon={() => <Image style={{ height: 25, width: 25, borderRadius: 5, borderColor: '#ffffff', borderWidth: 1 }} source={{ uri: uri }} />}
                    style={{
                        inputWeb: styles.picker,
                        inputIOS: styles.picker,
                        iconContainer: {
                            top: Platform.OS === 'web' ? 10 : 8,
                            left: Platform.OS === 'web' ? 8 : 6,
                            width: 10
                        },
                    }}
                    value={timesheet.project}
                    onValueChange={(value) => setTimesheet({ ...timesheet, project: value })}
                    items={projects}
                />
                {Platform.OS === 'web' ?
                    <input id="date" type="date" value={timesheet.date} onChange={(e) => { setTimesheet({ ...timesheet, date: e.target.value }) }}
                        style={{ backgroundColor: '#000000', color: '#ffffff', borderWidth: 1, borderColor: '#666666', borderStyle: 'solid', padding: 5, marginTop: 5, marginBottom: 5, fontSize: 20, width: 'calc(100% - 12px)', fontFamily: 'arial', borderRadius: 10 }}
                    />
                    :
                    <View style={{ backgroundColor: '#000000', borderWidth: 1, borderColor: '#666666', borderStyle: 'solid', padding: 0, marginTop: 5, marginBottom: 5, height: 30, width: '100%', borderRadius: 10 }}>
                        <WebView
                            style={{ display: webViewLag, borderRadius: 10 }}
                            ref={inputRef}
                            source={{
                                html: `
                                <head>
                                <meta name="viewport" content="width=device-width; initial-scale=1.0; maximum-scale=1.0; user-scalable=no;" />
                                </head>
                                <body style="background-color:#000000;margin:0px;padding:5px;">
                                <input style="all:unset;width:100%;height:100%;background-color:#000000;color:#ffffff;font-family:arial;" id="editor" onchange="window.ReactNativeWebView.postMessage(document.querySelector('#editor').value)" type="date" value="${timesheet.date}"/>
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
                                setTimesheet({ ...timesheet, date: value });
                            }}
                        />
                    </View>
                }
                <TextInput inputAccessoryViewID='main' spellCheck={false} value={timesheet.category} keyboardType='default' onChangeText={value => { setTimesheet({ ...timesheet, category: value }) }} placeholder='category' style={[styles.textInput]} />
                <TextInput inputAccessoryViewID='main' spellCheck={false} value={timesheet.hours} keyboardType='numeric' onChangeText={value => { setTimesheet({ ...timesheet, hours: value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1') }) }} placeholder='hours' style={[styles.textInput]} />
                <TextInput inputAccessoryViewID='main' spellCheck={false} value={timesheet.details} multiline={true} textAlignVertical={'top'} keyboardType='default' onChangeText={value => { setTimesheet({ ...timesheet, details: value }) }} placeholder='details' style={[styles.textInput, { height: 200 }]} />

                {githubCommits.length === 0 ? <Text style={{ marginBottom: 10, alignSelf: 'center' }} onPress={async () => { await pullGithubCommits(); }}>pull latest commits from github →</Text> : <RNPickerSelect
                    placeholder={{ label: 'select a recent commit from github' }}
                    Icon={() => <Image style={{ height: 25, width: 25, borderRadius: 5, borderColor: '#ffffff', borderWidth: 1 }} source={require('../assets/images/github.png')} />}
                    style={{
                        inputWeb: styles.picker,
                        inputIOS: styles.picker,
                        iconContainer: {
                            top: Platform.OS === 'web' ? 10 : 8,
                            left: Platform.OS === 'web' ? 8 : 6,
                            width: 10
                        },
                    }}
                    onValueChange={(value) => setTimesheet({ ...timesheet, details: value })}
                    items={githubCommits}
                />}
                <View style={{ flexDirection: 'row', marginTop: 10, justifyContent: 'center', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => { navigation.goBack(); }} style={{ marginRight: 20 }}><Text style={{ textAlign: 'center' }}>cancel</Text></TouchableOpacity>
                    <TouchableOpacity onPress={submit} style={{ borderRadius: 10, padding: 10, width: 150, backgroundColor: '#3F0054', marginRight: -20 }}><Text style={{ textAlign: 'center' }}>{route.params.id ? `save` : `add`}</Text></TouchableOpacity>
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
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
        alignItems: 'center',
        justifyContent: 'center'
    },
    baseText: {
        fontFamily: 'Arial',
        color: '#ffffff'
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
    textInput: { backgroundColor: '#000000', color: '#ffffff', borderWidth: 1, borderColor: '#666666', borderStyle: 'solid', padding: 5, marginTop: 5, marginBottom: 5, fontSize: 20, width: '100%', borderRadius: 10 },
    picker: { backgroundColor: '#000000', color: '#ffffff', borderWidth: 1, borderColor: '#666666', borderStyle: 'solid', padding: 5, marginTop: 5, marginBottom: 5, fontSize: 20, borderRadius: 10, paddingLeft: 35 }
});
