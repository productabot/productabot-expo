import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, FlatList, RefreshControl, ScrollView, TextInput, Platform, Keyboard } from 'react-native';
import { Text, View } from '../components/Themed';
import { API, graphqlOperation, Auth } from 'aws-amplify';
import { LoadingComponent } from '../components/LoadingComponent';
import * as root from '../Root';
import RNPickerSelect from 'react-native-picker-select';

export default function EntryScreen({ route, navigation }: any) {
    const [state, setState] = useState({
        projects: [],
        dates: [],
        timesheet: {},
        loading: false,
        date: new Date()
    });
    useEffect(() => {
        console.log(`componentDidMount`);
        if (!route.params) { route.params = {}; }
        onRefresh();
    }, []);

    let onRefresh = async () => {
        setState({ ...state, loading: true });

        //create an array of dates
        let dates = []
        for (let i = -20; i < 40; i++) {
            let date = new Date();
            date.setDate(date.getDate() + i);
            dates.push({ label: date.toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), value: await root.exportDate(date) });
        }
        //get all projects
        let projects = await API.graphql(graphqlOperation(`{
            projects {
              id
              name
              image
            }
          }
          `));

        //load existing timesheet if editing
        let timesheet = {};
        if (route.params.id) {
            let data = await API.graphql(graphqlOperation(`{
                    timesheets_by_pk(id: "${route.params.id}") {
                      id
                      project_id
                      date
                      hours
                      details
                    }
                  }
                  `));
            timesheet = data.data.timesheets_by_pk;
        }

        setState({
            ...state,
            loading: false,
            dates: dates,
            projects: projects.data.projects.map(obj => { return ({ label: obj.name, value: obj.id }) }),
            project: route.params.id ? timesheet.project_id : route.params.project_id ? route.params.project_id : projects.data.projects[0].id,
            date: route.params.id ? timesheet.date : route.params.date ? await root.exportDate(new Date(route.params.date), 1) : dates[20].value,
            hours: route.params.id ? timesheet.hours.toString() : null,
            details: route.params.id ? timesheet.details : null
        });

    }

    const submit = async () => {
        Keyboard.dismiss();
        setState({ ...state, loading: true })
        try {
            let response = await API.graphql(graphqlOperation(route.params.id
                ?
                `            
                mutation($project_id: uuid, $date: date, $hours: numeric, $details: String) {
                    update_timesheets_by_pk(pk_columns: {id: "${route.params.id}"}, _set: {date: $date, hours: $hours, details: $details, project_id: $project_id}) {id}
                }
                `
                :
                `
                mutation($project_id: uuid, $date: date, $hours: numeric, $details: String) {
                    insert_timesheets_one(object: {project_id: $project_id, date: $date, hours: $hours, details: $details }) {id}
                }
              `, { project_id: state.project, date: state.date, hours: state.hours, details: state.details }));
            console.log(response);
            setState({ ...state, hours: null, details: null, date: state.dates[20].value, project: state.projects[0].value, loading: false });
            navigation.navigate('timesheet');
        }
        catch (err) {
            setState({ ...state, hours: null, details: null, date: state.dates[20].value, project: state.projects[0].value, loading: false });
            console.log(err);
        }
    }

    return (
        <View style={styles.container}>
            {root.desktopWeb ?
                <View style={{ height: 50 }} />
                :
                <View style={{ paddingTop: 40, paddingBottom: 10 }}>
                    <Text>{route.params.id ? 'Edit Entry' : 'Add Entry'}</Text>
                </View>}
            <ScrollView
                style={{ maxWidth: 800, width: '100%', height: '100%', padding: 10 }}
                contentContainerStyle={{ display: 'flex', alignItems: 'center' }}
                refreshControl={
                    <RefreshControl
                        refreshing={state.loading}
                        onRefresh={onRefresh}
                        colors={["#ffffff"]}
                        tintColor='#ffffff'
                        titleColor="#ffffff"
                        title=""
                    />}
                keyboardShouldPersistTaps="always"
            >
                <RNPickerSelect
                    placeholder={{}}
                    style={{
                        inputWeb: styles.picker,
                        inputIOS: styles.picker
                    }}
                    value={state.project}
                    onValueChange={(value) => setState({ ...state, project: value })}
                    items={state.projects}
                />
                <RNPickerSelect
                    placeholder={{}}
                    style={{
                        inputWeb: styles.picker,
                        inputIOS: styles.picker
                    }}
                    value={state.date}
                    onValueChange={(value) => setState({ ...state, date: value })}
                    items={state.dates}
                />
                <TextInput value={state.hours} keyboardType='numeric' onChangeText={value => { setState({ ...state, hours: value }) }} placeholder='hours' style={[styles.textInput, isWeb && { outlineWidth: 0 }]}></TextInput>
                <TextInput value={state.details} multiline={true} textAlignVertical={'top'} keyboardType='default' onChangeText={value => { setState({ ...state, details: value }) }} placeholder='details' style={[styles.textInput, { height: 200 }, isWeb && { outlineWidth: 0 }]}></TextInput>
                <TouchableOpacity style={[styles.touchableOpacity, { backgroundColor: '#3F0054' }]}
                    onPress={submit}
                >
                    <Text style={[styles.baseText, styles.buttonText]}>{route.params.id ? `save` : `submit`}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.touchableOpacity, { backgroundColor: '#000000' }]}
                    onPress={() => { navigation.navigate('timesheet') }}>
                    <Text style={[styles.baseText, styles.buttonText]}>go back</Text>
                </TouchableOpacity>
            </ScrollView>
            {state.loading && <LoadingComponent />}
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
        margin: s(10)
    },
    buttonText: {
        fontSize: s(30)
    },
    textInput: { backgroundColor: '#000000', color: '#ffffff', borderWidth: 1, borderColor: '#ffffff', borderStyle: 'solid', padding: 5, marginTop: 5, marginBottom: 5, fontSize: 20, width: '100%' },
    picker: { backgroundColor: '#000000', color: '#ffffff', borderWidth: 1, borderColor: '#ffffff', borderStyle: 'solid', padding: 5, marginTop: 5, marginBottom: 5, fontSize: 20 }
});
