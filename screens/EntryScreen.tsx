import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, FlatList, RefreshControl, ScrollView, TextInput, Platform, Keyboard, Alert } from 'react-native';
import { Text, View } from '../components/Themed';
import { API, graphqlOperation, Auth } from 'aws-amplify';
import { LoadingComponent } from '../components/LoadingComponent';
import * as root from '../Root';
import RNPickerSelect from 'react-native-picker-select';

export default function EntryScreen({ route, navigation }: any) {
    const [projects, setProjects] = useState([]);
    const [dates, setDates] = useState([]);
    const [timesheet, setTimesheet] = useState({
        date: new Date(),
        project: null,
        category: null,
        hours: null,
        details: null
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!route.params) { route.params = {}; }
        onRefresh();
    }, []);

    let onRefresh = async () => {
        setLoading(true);

        //create an array of dates
        let dates = [];
        for (let i = -20; i < 40; i++) {
            let date = new Date();
            date.setDate(date.getDate() + i);
            dates.push({ label: date.toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), value: await root.exportDate(date) });
        }
        //get all projects
        let projects = await API.graphql(graphqlOperation(`{
            projects(order_by: {name: asc}) {
              id
              name
              image
            }
          }
          `));

        //check if the user has any projects
        if (projects.data.projects.length === 0) {
            alert('You must add a project before adding a time entry');
            navigation.navigate('projects');
        }

        //load existing timesheet if editing
        let timesheet = {};
        if (route.params.id) {
            let data = await API.graphql(graphqlOperation(`{
                    timesheets_by_pk(id: "${route.params.id}") {
                      id
                      project_id
                      date
                      category
                      hours
                      details
                    }
                  }
                  `));
            timesheet = data.data.timesheets_by_pk;
        }

        setTimesheet({
            project: route.params.id ? timesheet.project_id : route.params.project_id ? route.params.project_id : projects.data.projects.length !== 0 ? projects.data.projects[0].id : null,
            date: route.params.id ? timesheet.date : route.params.date ? await root.exportDate(new Date(route.params.date), 1) : dates[20].value,
            category: route.params.id ? timesheet.category : null,
            hours: route.params.id ? timesheet.hours.toString() : null,
            details: route.params.id ? timesheet.details : null
        });
        setProjects(projects.data.projects.map(obj => { return ({ label: obj.name, value: obj.id }) }));
        setDates(dates);
        setLoading(false);
    }

    const submit = async () => {
        Keyboard.dismiss();
        setLoading(true);
        try {
            let response = await API.graphql(graphqlOperation(route.params.id
                ?
                `            
                mutation($project_id: uuid, $date: date, $hours: numeric, $details: String, $category: String) {
                    update_timesheets_by_pk(pk_columns: {id: "${route.params.id}"}, _set: {date: $date, hours: $hours, details: $details, project_id: $project_id, category: $category}) {id}
                }
                `
                :
                `
                mutation($project_id: uuid, $date: date, $hours: numeric, $details: String, $category: String) {
                    insert_timesheets_one(object: {project_id: $project_id, date: $date, hours: $hours, details: $details, category: $category }) {id}
                }
              `, { project_id: timesheet.project, date: timesheet.date, hours: timesheet.hours, details: timesheet.details, category: timesheet.category }));
            console.log(response);
            setTimesheet({ hours: null, details: null, category: null, date: dates[20].value, project: projects[0].value });
            setLoading(false);
            navigation.navigate('timesheet');
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
                <View style={{ paddingTop: 40, paddingBottom: 10 }}>
                    <Text>{route.params.id ? 'Edit Entry' : 'Add Entry'}</Text>
                </View>}
            <ScrollView
                style={{ maxWidth: root.desktopWidth, width: '100%', height: '100%', padding: 10 }}
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
                keyboardShouldPersistTaps="always"
            >
                <RNPickerSelect
                    placeholder={{}}
                    style={{
                        inputWeb: styles.picker,
                        inputIOS: styles.picker
                    }}
                    value={timesheet.project}
                    onValueChange={(value) => setTimesheet({ ...timesheet, project: value })}
                    items={projects}
                />
                <RNPickerSelect
                    placeholder={{}}
                    style={{
                        inputWeb: styles.picker,
                        inputIOS: styles.picker
                    }}
                    value={timesheet.date}
                    onValueChange={(value) => setTimesheet({ ...timesheet, date: value })}
                    items={dates}
                />
                <TextInput value={timesheet.category} keyboardType='default' onChangeText={value => { setTimesheet({ ...timesheet, category: value }) }} placeholder='category' style={[styles.textInput, isWeb && { outlineWidth: 0 }]} />
                <TextInput value={timesheet.hours} keyboardType='numeric' onChangeText={value => { setTimesheet({ ...timesheet, hours: value.replace(/[^0-9]/g, '') }) }} placeholder='hours' style={[styles.textInput, isWeb && { outlineWidth: 0 }]} />
                <TextInput value={timesheet.details} multiline={true} textAlignVertical={'top'} keyboardType='default' onChangeText={value => { setTimesheet({ ...timesheet, details: value }) }} placeholder='details' style={[styles.textInput, { height: 200 }, isWeb && { outlineWidth: 0 }]} />
                <TouchableOpacity style={[styles.touchableOpacity, { backgroundColor: '#3F0054' }]}
                    onPress={submit}
                >
                    <Text style={[styles.baseText, styles.buttonText]}>{route.params.id ? `save` : `submit`}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.touchableOpacity, { backgroundColor: '#000000' }]}
                    onPress={() => {
                        navigation.goBack();
                    }}>
                    <Text style={[styles.baseText, styles.buttonText]}>go back</Text>
                </TouchableOpacity>
            </ScrollView>
            {loading && <LoadingComponent />}
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
