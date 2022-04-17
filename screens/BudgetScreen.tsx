import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, FlatList, RefreshControl, ScrollView, TextInput, Platform, Keyboard, Alert, useWindowDimensions, Image, ActivityIndicator } from 'react-native';
import { Text, View } from '../components/Themed';
import { API, graphqlOperation } from "@aws-amplify/api";
import { LoadingComponent } from '../components/LoadingComponent';
import * as root from '../Root';
import RNPickerSelect from 'react-native-picker-select';
import { InputAccessoryViewComponent } from '../components/InputAccessoryViewComponent';
import { WebView } from 'react-native-webview';
import { useTheme } from '@react-navigation/native';
import InputComponent from '../components/InputComponent';

export default function BudgetScreen({ route, navigation, refresh, setLoading }: any) {
    const [projects, setProjects] = useState([]);
    const [dates, setDates] = useState([]);
    const [budget, setBudget] = useState({
        date: new Date(),
        project: null,
        category: null,
        price: null,
        details: null,
        type: 'expense'
    });
    const [refreshControl, setRefreshControl] = useState(false);
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
            alert('You must add a project before adding a budget entry');
            navigation.goBack();
        }

        //load existing budget if editing
        let budget = {};
        let lastProject = null;
        if (route.params.id) {
            let data = await API.graphql(graphqlOperation(`{
                    budget_by_pk(id: "${route.params.id}") {
                      id
                      project_id
                      date
                      category
                      price
                      details
                      type
                    }
                  }
                  `));
            budget = data.data.budget_by_pk;
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

        setBudget({
            project: route.params.id ? budget.project_id : route.params.project_id ? route.params.project_id : lastProject ? lastProject : projects.data.projects.length !== 0 ? projects.data.projects[0].id : null,
            date: route.params.id ? budget.date : route.params.date ? await root.exportDate(new Date(route.params.date), 1) : dates[20].value,
            category: route.params.id ? budget.category : null,
            price: route.params.id ? budget.price.toString() : null,
            details: route.params.id ? budget.details : null,
            type: route.params.id ? budget.type : 'expense'
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
                mutation($project_id: uuid, $date: date, $price: numeric, $details: String, $category: String, $type: String) {
                    update_budget_by_pk(pk_columns: {id: "${route.params.id}"}, _set: {date: $date, price: $price, details: $details, project_id: $project_id, category: $category, type: $type}) {id}
                }
                `
                :
                `
                mutation($project_id: uuid, $date: date, $price: numeric, $details: String, $category: String, $type: String) {
                    insert_budget_one(object: {project_id: $project_id, date: $date, price: $price, details: $details, category: $category, type: $type }) {id}
                }
              `, { project_id: budget.project, date: budget.date, price: parseFloat(budget.price).toFixed(2), details: budget.details, category: budget.category, type: budget.type }));
            setBudget({ price: null, details: null, category: null, date: dates[20].value, project: projects[0].value, type: 'expense' });
            setLoading(false);
            navigation.goBack();
        }
        catch (err) {
            setBudget({ price: null, details: null, date: dates[20].value, project: projects[0].value, type: 'expense' });
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
                    <Text>{route.params.id ? 'edit budget entry' : 'add budget entry'}</Text>
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
                <InputComponent type="select" value={budget.project} options={projects} optionImage={true} setValue={(value) => { setBudget({ ...budget, project: value }) }} />
                <InputComponent type="date" value={budget.date} setValue={(value) => { setBudget({ ...budget, date: value }) }} />
                <InputComponent type="select" value={budget.type} options={[{ id: 'expense', name: 'expense' }, { id: 'income', name: 'income' }]} setValue={(value) => { setBudget({ ...budget, type: value }) }} />
                <TextInput placeholderTextColor={colors.placeholder} inputAccessoryViewID='main' spellCheck={false} value={budget.price} keyboardType='numeric' onChangeText={value => { setBudget({ ...budget, price: value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1') }) }} placeholder='price' style={[styles.textInput]} />
                <TextInput placeholderTextColor={colors.placeholder} inputAccessoryViewID='main' spellCheck={false} value={budget.category} keyboardType='default' onChangeText={value => { setBudget({ ...budget, category: value }) }} placeholder='category' style={[styles.textInput]} />
                <TextInput placeholderTextColor={colors.placeholder} inputAccessoryViewID='main' spellCheck={false} value={budget.details} multiline={true} textAlignVertical={'top'} keyboardType='default' onChangeText={value => { setBudget({ ...budget, details: value }) }} placeholder='details' style={[styles.textInput, { height: 200 }]} />
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
