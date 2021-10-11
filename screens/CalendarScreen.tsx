import React, { useState, useRef } from 'react';
import { Text, View } from '../components/Themed';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { RefreshControl, ScrollView, TouchableOpacity, Image, useWindowDimensions, Platform, Alert, Animated, Easing } from 'react-native';
import * as root from '../Root';
import { API, graphqlOperation } from 'aws-amplify';
import { useFocusEffect } from '@react-navigation/native';
import Popover from '../components/PopoverMenuRenderer';

LocaleConfig.locales['en'] = {
    monthNames: ['january', 'februrary', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'],
    monthNamesShort: ['jan', 'feb', 'mar', 'apr', 'may', 'june', 'july', 'aug', 'sept', 'oct', 'nov', 'dec'],
    dayNames: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'saturday', 'sunday'],
    dayNamesShort: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
};
LocaleConfig.defaultLocale = 'en';

import { Menu, MenuOptions, MenuTrigger } from 'react-native-popup-menu';
let dateOpacity = false;
export default function CalendarScreen({ route, navigation, refresh, setLoading }: any) {
    const window = useWindowDimensions();
    const [refreshControl, setRefreshControl] = useState(false);
    const [timesheets, setTimesheets] = useState([]);
    const [month, setMonth] = useState(new Date().toLocaleDateString('fr-CA'));
    const [firstLoad, setFirstLoad] = useState(false);
    const opacity = Array(42).fill(0).map(() => useRef(new Animated.Value(0)).current);

    useFocusEffect(
        React.useCallback(() => {
            if (!route.params) { route.params = {}; }
            onRefresh();
        }, [refresh, month, route.params])
    );

    let onRefresh = async (showRefreshControl = false) => {
        showRefreshControl ? setRefreshControl(true) : setLoading(true);
        dateOpacity = false;
        let lastMonth = new Date(month);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        let nextMonth = new Date(month);
        nextMonth.setMonth(nextMonth.getMonth() + 2);
        let data = await API.graphql(graphqlOperation(`
        {
            timesheets(order_by: {date: asc, project: {name: asc}, hours: desc}, where: {date: {_gte: "${lastMonth.toLocaleDateString('fr-CA').substr(0, 7)}-23", _lt: "${nextMonth.toLocaleDateString('fr-CA').substr(0, 7)}-07"}}) {
              project {
                id
                name
                key
                color
                image
              }
              hours
              category
              details
              date
              id
            }
        }          
        `));
        setTimesheets(data.data.timesheets);
        showRefreshControl ? setRefreshControl(false) : setLoading(false);
        for (let i = 0; i < 42; i++) {
            Animated.sequence([Animated.delay(10 * i), Animated.timing(opacity[i], { toValue: 1, duration: 100, easing: Easing.ease, useNativeDriver: false })]).start();
        }
    }

    return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: root.desktopWeb ? 30 : 0, marginTop: root.desktopWeb ? 0 : -20 }}>
            <ScrollView
                style={{ maxWidth: Math.min(root.desktopWidth, window.width), height: window.height - 20, padding: 10 }}
                contentContainerStyle={{ display: 'flex', alignItems: 'center' }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshControl}
                        onRefresh={() => onRefresh(true)}
                        colors={["#ffffff"]}
                        tintColor='#ffffff'
                        titleColor="#ffffff"
                        title=""
                    />}
            >
                <Calendar
                    enableSwipeMonths={!root.desktopWeb}
                    style={{ width: (Math.min(root.desktopWidth, window.width) - (root.desktopWeb ? 12 : 0)) }}
                    current={month}
                    theme={{
                        backgroundColor: '#ffffff00',
                        calendarBackground: '#ffffff00',
                        textSectionTitleColor: '#ffffff',
                        selectedDayBackgroundColor: '#ffffff00',
                        selectedDayTextColor: '#ffffff',
                        todayTextColor: '#ffffff',
                        dayTextColor: '#ffffff',
                        textDisabledColor: '#aaaaaa',
                        dotColor: '#ffffff',
                        selectedDotColor: '#ffffff',
                        arrowColor: '#ffffff',
                        monthTextColor: '#ffffff',
                        indicatorColor: '#ffffff',
                        textDayFontFamily: 'Arial',
                        textMonthFontFamily: 'Arial',
                        textDayHeaderFontFamily: 'Arial',
                        textMonthFontSize: 18,
                        textDayHeaderFontSize: 14,
                    }}
                    markedDates={{}}
                    hideExtraDays={false}
                    onMonthChange={(date) => { setMonth(date.dateString); }}
                    renderArrow={(direction) => (<Text>{direction === 'left' ? '←' : '→'}</Text>)}
                    firstDay={0}
                    onPressArrowLeft={subtractMonth => subtractMonth()}
                    onPressArrowRight={addMonth => addMonth()}
                    dayComponent={({ date, state }) => {
                        if (!dateOpacity) {
                            let currentDateString = date.dateString;
                            let dateOpacityObject = {};
                            for (let i = 0; i < 42; i++) {
                                if (!firstLoad || timesheets.filter(timesheet => timesheet.date === currentDateString).length === 0) {
                                    dateOpacityObject[currentDateString] = i;
                                }
                                else {
                                    dateOpacityObject[currentDateString] = -1;
                                }
                                let currentDate = new Date(currentDateString);
                                currentDate.setDate(currentDate.getDate() + 1);
                                currentDateString = currentDate.toISOString().split('T')[0];
                            }
                            dateOpacity = dateOpacityObject;
                            for (let i = 0; i < 42; i++) {
                                opacity[i].setValue(0);
                            }
                            if (!firstLoad) {
                                setTimeout(() => { setFirstLoad(true); }, 1000);
                            }
                        }
                        return (
                            <ScrollView style={[
                                { borderWidth: 1, borderColor: '#222222', borderStyle: 'solid', marginBottom: -15, marginLeft: 0 },
                                root.desktopWeb ? { width: (Math.min(root.desktopWidth, window.width) - (root.desktopWeb ? 12 : 0)) / 7, height: 130 } :
                                    { width: window.width / 7, height: 100 }
                            ]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: date.dateString === new Date().toLocaleDateString('fr-CA') ? '#333333' : 'unset' }}>
                                    <Text style={{ margin: 5, textAlign: 'left', color: state === 'disabled' ? '#aaaaaa' : '#ffffff', fontSize: 12 }}>
                                        {date.day}
                                    </Text>
                                    <TouchableOpacity onPress={() => { navigation.navigate('entry', { date: date.dateString, id: undefined }); }} style={{ paddingRight: 3 }}><Text style={{ color: '#aaaaaa' }}>+</Text></TouchableOpacity>
                                </View>
                                {timesheets.filter(timesheet => timesheet.date === date.dateString).map((obj, index) =>
                                    <Menu key={index} renderer={Popover} rendererProps={{ anchorStyle: { backgroundColor: '#000000', borderColor: '#666666', borderWidth: 1, borderStyle: 'solid' } }} >
                                        <MenuTrigger>
                                            <Animated.View style={{ opacity: dateOpacity[date.dateString] !== -1 ? opacity[dateOpacity[date.dateString]] : 1, paddingLeft: 2, paddingRight: 2, backgroundColor: obj.project.color, width: '100%', height: root.desktopWeb ? 17 : 19, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <Text numberOfLines={1} style={{ fontSize: 12 }}>{root.desktopWeb ? obj.project.name : obj.project.key}</Text>
                                                <Text numberOfLines={1} style={{ fontSize: 12, minWidth: obj.hours.toString().length * 6 }}>{obj.hours}</Text>
                                            </Animated.View>
                                        </MenuTrigger>
                                        <MenuOptions customStyles={{
                                            optionsWrapper: { backgroundColor: 'transparent', width: 250 },
                                            optionsContainer: { backgroundColor: 'transparent', shadowOpacity: 0 },
                                        }}>
                                            <View style={{ backgroundColor: '#000000', borderColor: '#666666', borderWidth: 1, borderStyle: 'solid', width: 250, borderRadius: 10 }}>
                                                <ScrollView style={{ maxHeight: 200, paddingBottom: 5 }}>
                                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 5, width: '100%' }}>
                                                        <TouchableOpacity onPress={() => { navigation.navigate('project', { id: obj.project.id }); }} style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center' }}>
                                                            <Image style={{ height: 35, width: 35, borderRadius: 5, borderColor: '#ffffff', borderWidth: 1 }} source={{ uri: `https://files.productabot.com/public/${obj.project.image}` }} />
                                                            <View style={{ flexDirection: 'column', marginLeft: 5 }}>
                                                                <Text numberOfLines={1} style={{ marginLeft: 3 }}>{obj.project.name}</Text>
                                                                <View style={{ flexDirection: 'row' }}>
                                                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#444444', borderRadius: 5, paddingLeft: 5, paddingRight: 5, paddingTop: 0, paddingBottom: 0 }}>
                                                                        <Text numberOfLines={1} style={{ fontSize: 12 }}>{obj.category}</Text>
                                                                    </View>
                                                                </View>
                                                            </View>
                                                        </TouchableOpacity>
                                                        <Text numberOfLines={1} style={{ fontSize: 30, fontWeight: 'bold' }}>{obj.hours}<Text numberOfLines={1} style={{ fontSize: 16, fontWeight: 'normal' }}> hrs</Text></Text>
                                                    </View>
                                                    <Text style={{ margin: 5 }}>{obj.details}</Text>
                                                </ScrollView>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                                                    <TouchableOpacity style={{ backgroundColor: '#3F0054', padding: 5, width: '50%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderBottomLeftRadius: 9 }} onPress={async () => {
                                                        const deleteFunction = async () => {
                                                            setLoading(true);
                                                            await API.graphql(graphqlOperation(`mutation {delete_timesheets_by_pk(id: "${obj.id}") {id}}`));
                                                            await onRefresh();
                                                            setLoading(false);
                                                        }
                                                        if (Platform.OS !== 'web') {
                                                            Alert.alert('Warning', 'Are you sure you want to delete this time entry?',
                                                                [{ text: "No", style: "cancel" }, { text: "Yes", style: "destructive", onPress: async () => { await deleteFunction(); } }]);
                                                        }
                                                        else if (confirm('Are you sure you want to delete this time entry?')) { await deleteFunction() }
                                                    }}><Text>Delete</Text></TouchableOpacity>
                                                    <TouchableOpacity style={{ backgroundColor: '#3F91A1', padding: 5, width: '50%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderBottomRightRadius: 9 }} onPress={() => {
                                                        onRefresh(); navigation.navigate('entry', { id: obj.id, date: undefined })
                                                    }} ><Text>Edit</Text></TouchableOpacity>
                                                </View>
                                            </View>
                                        </MenuOptions>
                                    </Menu>
                                )}
                            </ScrollView>
                        );
                    }}
                />
            </ScrollView>
        </View>
    );
}