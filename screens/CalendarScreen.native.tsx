import React, { useState, useRef } from 'react';
import { Text, View } from '../components/Themed';
import { Calendar, CalendarList, LocaleConfig } from 'react-native-calendars';
import { RefreshControl, ScrollView, TouchableOpacity, Image, useWindowDimensions, Platform, Alert } from 'react-native';
import * as root from '../Root';
import { API, graphqlOperation } from "@aws-amplify/api";
import { useFocusEffect } from '@react-navigation/native';
import Popover from '../components/PopoverMenuRenderer';
import { useTheme } from '@react-navigation/native';

LocaleConfig.locales['en'] = {
    monthNames: ['january', 'februrary', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'],
    monthNamesShort: ['jan', 'feb', 'mar', 'apr', 'may', 'june', 'july', 'aug', 'sept', 'oct', 'nov', 'dec'],
    dayNames: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'saturday', 'sunday'],
    dayNamesShort: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
};
LocaleConfig.defaultLocale = 'en';

import { Menu, MenuOptions, MenuTrigger } from 'react-native-popup-menu';
let changingMonths = false;
let month = new Date();
let menuOpen = false;

const getDateRange = (date_from, date_to) => {
    date_from.setDate(date_from.getDate() + 1);
    date_to.setDate(date_to.getDate() + 1);
    let arr = [];
    for (let dt = date_from; dt <= date_to; dt.setDate(dt.getDate() + 1)) {
        arr.push(new Date(dt).toLocaleDateString('fr-CA'));
    }
    return arr;
}

export default function CalendarScreen({ route, navigation, refresh, setLoading }: any) {
    const windowDimensions = useWindowDimensions();
    const [refreshControl, setRefreshControl] = useState(false);
    const [entries, setEntries] = useState([]);
    const [tasks, setTasks] = useState([]);
    const scrollRef = useRef();
    const { colors } = useTheme();
    const [showEntries, setShowEntries] = useState(true);
    const [showTasks, setShowTasks] = useState(true);

    const calendarTheme = {
        backgroundColor: '#ffffff00',
        calendarBackground: '#ffffff00',
        textSectionTitleColor: colors.text,
        selectedDayBackgroundColor: '#ffffff00',
        selectedDayTextColor: colors.text,
        todayTextColor: colors.text,
        dayTextColor: colors.text,
        textDisabledColor: '#aaaaaa',
        dotColor: colors.text,
        selectedDotColor: colors.text,
        arrowColor: '#ffffff00',
        monthTextColor: '#ffffff00',
        indicatorColor: colors.text,
        textDayFontFamily: 'Arial',
        textMonthFontFamily: 'Arial',
        textDayHeaderFontFamily: 'Arial',
        textMonthFontSize: 18,
        textDayHeaderFontSize: 14,
    };

    const goToPreviousMonth = () => {
        if (!changingMonths) {
            changingMonths = true;
            scrollRef.current && scrollRef.current.scrollTo({ x: 0, animated: true });
            setTimeout(() => {
                const innerMonth = new Date(month);
                innerMonth.setMonth(innerMonth.getMonth() - 1);
                month = innerMonth.toLocaleDateString('fr-CA');
                onRefresh();
                changingMonths = false;
            }, 0);
        }
    }

    const goToNextMonth = () => {
        if (!changingMonths) {
            changingMonths = true;
            scrollRef.current && scrollRef.current.scrollTo({ x: windowDimensions.width * 2, animated: true });
            setTimeout(() => {
                const innerMonth = new Date(month);
                innerMonth.setMonth(innerMonth.getMonth() + 1);
                month = innerMonth.toLocaleDateString('fr-CA');
                onRefresh();
                changingMonths = false;
            }, 0);
        }
    }
    useFocusEffect(
        React.useCallback(() => {
            if (!route.params) { route.params = {}; }
            onRefresh();
        }, [refresh, route.params])
    );

    let onRefresh = async (showRefreshControl = false) => {
        showRefreshControl ? setRefreshControl(true) : setLoading(true);
        const monthDate = new Date(month);
        monthDate.setDate(1);
        const startMonth = new Date(monthDate);
        const endMonth = new Date(monthDate);
        startMonth.setDate(startMonth.getDate() - 7);
        endMonth.setMonth(endMonth.getMonth() + 1);
        endMonth.setDate(endMonth.getDate() + 7);
        // console.log(startMonth.toLocaleDateString('fr-CA'), endMonth.toLocaleDateString('fr-CA'));
        //entries(order_by: {date: asc, project: {name: asc}, hours: desc}, where: {date: {_gte: "${startMonth.toLocaleDateString('fr-CA')}", _lt: "${endMonth.toLocaleDateString('fr-CA')}"}}) {
        let data = await API.graphql(graphqlOperation(`
        {
            entries(order_by: {date: asc, project: {name: asc}, hours: desc}, where: {date: {_gte: "${startMonth.toLocaleDateString('fr-CA')}", _lt: "${endMonth.toLocaleDateString('fr-CA')}"}}) {
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
            tasks(order_by: {date: asc, time: asc, project: {name: asc}}, where: {date: {_gte: "${startMonth.toLocaleDateString('fr-CA')}", _lt: "${endMonth.toLocaleDateString('fr-CA')}"}}) {
              project {
                id
                name
                key
                color
                image
              }
              category
              details
              date
              time
              status
              id
            }
        }          
        `));
        setEntries(data.data.entries);
        setTasks(data.data.tasks);
        showRefreshControl ? setRefreshControl(false) : setLoading(false);
        scrollRef.current && scrollRef.current.scrollTo({ x: windowDimensions.width, animated: false });
    }

    const CustomCalendar = ({ givenMonth }) => {
        return (
            <Calendar
                style={{ width: windowDimensions.width }}
                current={givenMonth}
                theme={calendarTheme}
                hideExtraDays={false}
                firstDay={0}
                renderArrow={(direction) => (<Text style={{ color: '#ffffff00' }}>{direction === 'left' ? '←' : '→'}</Text>)}
                onPressArrowLeft={() => { goToPreviousMonth(); }}
                onPressArrowRight={() => { goToNextMonth(); }}
                dayComponent={({ date, state }) => <DayComponent date={date} state={state} />}
            />
        )
    }

    const GhostCalendar = ({ }) => {
        return (
            <Calendar
                style={{ width: windowDimensions.width }}
                current={'2020-01-01'}
                theme={{ ...calendarTheme, monthTextColor: '#ffffff00' }}
                hideExtraDays={false}
                firstDay={0}
                renderArrow={(direction) => (<Text style={{ color: '#ffffff00' }}>{direction === 'left' ? '←' : '→'}</Text>)}
                dayComponent={({ date, state }) =>
                    <View style={{ borderWidth: 1, borderColor: colors.card, borderStyle: 'solid', marginBottom: -15, marginLeft: 0, width: windowDimensions.width / 7, height: 100 }} />
                }
            />
        )
    }

    const DayComponent = ({ date, state }) => {
        return (
            <ScrollView
                style={[
                    { borderWidth: 1, borderColor: colors.card, borderStyle: 'solid', marginBottom: -15, marginLeft: 0 },
                    root.desktopWeb ? { width: windowDimensions.width / 7, height: 130 } :
                        { width: windowDimensions.width / 7, height: 100 }
                ]}>
                <Menu onOpen={() => { menuOpen = true; }} onClose={() => { menuOpen = false; }} key={date.date} renderer={Popover} rendererProps={{ anchorStyle: { backgroundColor: colors.background, borderColor: '#666666', borderWidth: 1, borderStyle: 'solid' } }} >
                    <MenuTrigger>
                        <View style={{ height: 100 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: date.dateString === new Date().toLocaleDateString('fr-CA') ? colors.placeholder : 'unset', height: 14 }}>
                                <Text style={{ marginLeft: 5, textAlign: 'left', color: colors.text, fontSize: 12 }}>
                                    {date.day}
                                </Text>
                                <Text style={{ color: '#aaaaaa', marginRight: 2, fontSize: 12, textAlign: 'right' }}>+</Text>
                            </View>
                            {showEntries && entries.filter(timesheet => timesheet.date === date.dateString).map((obj, index) =>
                                <Menu onOpen={() => { menuOpen = true; }} onClose={() => { menuOpen = false; }} key={index} renderer={Popover} rendererProps={{ anchorStyle: { backgroundColor: colors.background, borderColor: '#666666', borderWidth: 1, borderStyle: 'solid' } }} >
                                    <MenuTrigger>
                                        <View style={{ backgroundColor: obj.project.color, width: '100%', height: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <Image style={{ height: 12, width: 12, borderRadius: 3, marginRight: 2 }} source={{ uri: `https://files.productabot.com/public/${obj.project.image}` }} />
                                            <View style={{ backgroundColor: '#00000066', borderRadius: 3, paddingLeft: 3, paddingRight: 3, minWidth: obj.hours.toString().length * 6, marginRight: 2 }}><Text style={{ fontSize: 8, color: '#fff' }}>{obj.hours} hrs</Text></View>
                                        </View>
                                    </MenuTrigger>
                                    <MenuOptions customStyles={{
                                        optionsWrapper: { backgroundColor: 'transparent', width: 255 },
                                        optionsContainer: { backgroundColor: 'transparent', shadowOpacity: 0 },
                                    }}>
                                        <View style={{ backgroundColor: colors.background, borderColor: '#666666', borderWidth: 1, borderStyle: 'solid', width: 255, borderRadius: 10 }}>
                                            <ScrollView style={{ maxHeight: 200, paddingBottom: 5 }}>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 5, width: '100%' }}>
                                                    <TouchableOpacity onPress={() => { navigation.push('project', { id: obj.project.id }); }} style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center' }}>
                                                        <Image style={{ height: 35, width: 35, borderRadius: 5, borderColor: colors.text, borderWidth: 1 }} source={{ uri: `https://files.productabot.com/public/${obj.project.image}` }} />
                                                        <View style={{ flexDirection: 'column', marginLeft: 5 }}>
                                                            <Text numberOfLines={1} style={{ color: colors.text, marginLeft: 3 }}>{obj.project.name}</Text>
                                                            <View style={{ flexDirection: 'row' }}>
                                                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#444444', borderRadius: 5, paddingLeft: 5, paddingRight: 5, paddingTop: 0, paddingBottom: 0 }}>
                                                                    <Text numberOfLines={1} style={{ color: '#ffffff', fontSize: 12 }}>{obj.category}</Text>
                                                                </View>
                                                            </View>
                                                        </View>
                                                    </TouchableOpacity>
                                                    <Text numberOfLines={1} style={{ color: colors.text, fontSize: 30, fontWeight: 'bold' }}>{obj.hours}<Text numberOfLines={1} style={{ color: colors.text, fontSize: 16, fontWeight: 'normal' }}> hrs</Text></Text>
                                                </View>
                                                <Text style={{ color: colors.text, margin: 5 }}>{obj.details}</Text>
                                            </ScrollView>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                                                <TouchableOpacity style={{ backgroundColor: '#3F0054', padding: 5, width: '50%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderBottomLeftRadius: 9 }} onPress={async () => {
                                                    const deleteFunction = async () => {
                                                        setLoading(true);
                                                        await API.graphql(graphqlOperation(`mutation {delete_entries_by_pk(id: "${obj.id}") {id}}`));
                                                        await onRefresh();
                                                        setLoading(false);
                                                    }
                                                    Alert.alert('Warning', 'Are you sure you want to delete this time entry?',
                                                        [{ text: "No", style: "cancel" }, { text: "Yes", style: "destructive", onPress: async () => { await deleteFunction(); } }]);
                                                }}><Text style={{ color: '#ffffff' }}>Delete</Text></TouchableOpacity>
                                                <TouchableOpacity style={{ backgroundColor: '#3F91A1', padding: 5, width: '50%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderBottomRightRadius: 9 }} onPress={() => {
                                                    navigation.push('entry', { id: obj.id, date: undefined })
                                                }} ><Text style={{ color: '#ffffff' }}>Edit</Text></TouchableOpacity>
                                            </View>
                                        </View>
                                    </MenuOptions>
                                </Menu>
                            )}
                            {showTasks && tasks.filter(timesheet => timesheet.date === date.dateString).map((obj, index) =>
                                <Menu onOpen={() => { menuOpen = true; }} onClose={() => { menuOpen = false; }} key={index} renderer={Popover} rendererProps={{ anchorStyle: { backgroundColor: colors.background, borderColor: '#666666', borderWidth: 1, borderStyle: 'solid' } }} >
                                    <MenuTrigger>
                                        <View style={{ backgroundColor: obj.project.color, width: '100%', height: 12, flexDirection: 'row', alignItems: 'center' }}>
                                            {/* <Image style={{ height: 12, width: 12, borderRadius: 3, marginRight: 2 }} source={{ uri: `https://files.productabot.com/public/${obj.project.image}` }} /> */}
                                            <Text style={{ fontSize: 8, color: '#ffffff', textDecorationLine: obj.status === 'done' ? 'line-through' : 'none' }}> •{obj.details}{obj.time ? ' @ ' + new Date(obj.date + 'T' + obj.time).toLocaleTimeString([], { timeStyle: 'short' }).replace(' ', '').toLowerCase() : ''}</Text>
                                        </View>
                                    </MenuTrigger>
                                    <MenuOptions customStyles={{
                                        optionsWrapper: { backgroundColor: 'transparent', width: 255 },
                                        optionsContainer: { backgroundColor: 'transparent', shadowOpacity: 0 },
                                    }}>
                                        <View style={{ backgroundColor: colors.background, borderColor: '#666666', borderWidth: 1, borderStyle: 'solid', width: 255, borderRadius: 10 }}>
                                            <ScrollView style={{ maxHeight: 200, paddingBottom: 5 }}>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 5, width: '100%' }}>
                                                    <TouchableOpacity onPress={() => { navigation.push('project', { id: obj.project.id }); }} style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center' }}>
                                                        <Image style={{ height: 35, width: 35, borderRadius: 5, borderColor: colors.text, borderWidth: 1 }} source={{ uri: `https://files.productabot.com/public/${obj.project.image}` }} />
                                                        <View style={{ flexDirection: 'column', marginLeft: 5 }}>
                                                            <Text numberOfLines={1} style={{ color: colors.text, marginLeft: 3 }}>{obj.project.name}</Text>
                                                            <View style={{ flexDirection: 'row' }}>
                                                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#444444', borderRadius: 5, paddingLeft: 5, paddingRight: 5, paddingTop: 0, paddingBottom: 0 }}>
                                                                    <Text numberOfLines={1} style={{ color: '#ffffff', fontSize: 12 }}>{obj.category}</Text>
                                                                </View>
                                                            </View>
                                                        </View>
                                                    </TouchableOpacity>
                                                </View>
                                                <Text style={{ color: colors.text, margin: 5 }}>{obj.details}{obj.time ? ' @ ' + new Date(obj.date + 'T' + obj.time).toLocaleTimeString([], { timeStyle: 'short' }).replace(' ', '').toLowerCase() : ''}</Text>
                                            </ScrollView>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                                                <TouchableOpacity style={{ backgroundColor: '#3F0054', padding: 5, width: '50%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderBottomLeftRadius: 9 }} onPress={async () => {
                                                    const deleteFunction = async () => {
                                                        setLoading(true);
                                                        await API.graphql(graphqlOperation(`mutation {delete_tasks_by_pk(id: "${obj.id}") {id}}`));
                                                        await onRefresh();
                                                        setLoading(false);
                                                    }
                                                    Alert.alert('Warning', 'Are you sure you want to delete this task?',
                                                        [{ text: "No", style: "cancel" }, { text: "Yes", style: "destructive", onPress: async () => { await deleteFunction(); } }]);
                                                }}><Text style={{ color: '#ffffff' }}>Delete</Text></TouchableOpacity>
                                                <TouchableOpacity style={{ backgroundColor: '#3F91A1', padding: 5, width: '50%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderBottomRightRadius: 9 }} onPress={() => {
                                                    navigation.push('task', { id: obj.id })
                                                }} ><Text style={{ color: '#ffffff' }}>View</Text></TouchableOpacity>
                                            </View>
                                        </View>
                                    </MenuOptions>
                                </Menu>
                            )}
                        </View>
                    </MenuTrigger>
                    <MenuOptions customStyles={{
                        optionsWrapper: { backgroundColor: 'transparent', width: 255 },
                        optionsContainer: { backgroundColor: 'transparent', shadowOpacity: 0 },
                    }}>
                        <View style={{ backgroundColor: colors.background, borderColor: '#666666', borderWidth: 1, borderStyle: 'solid', width: 255, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', height: 40 }}>
                            <TouchableOpacity onPress={() => { navigation.push('entry', { date: date.dateString, id: undefined }); }} style={{ width: '50%', height: '100%', backgroundColor: '#3F0054', borderTopLeftRadius: 9, borderBottomLeftRadius: 9, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: '#ffffff', textAlign: 'center', fontSize: 14 }}>⏱ add entry</Text></TouchableOpacity>
                            <TouchableOpacity onPress={() => { navigation.push('edit_task', { date: date.dateString, id: undefined, status: 'backlog' }); }} style={{ width: '50%', height: '100%', backgroundColor: '#3F91A1', borderTopRightRadius: 9, borderBottomRightRadius: 9, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: '#ffffff', textAlign: 'center', fontSize: 14 }}>☉ add task</Text></TouchableOpacity>
                        </View>
                    </MenuOptions>
                </Menu>
            </ScrollView >
        );
    }

    return (
        <View style={{ flexDirection: 'column', justifyContent: 'flex-start', marginTop: root.desktopWeb ? 50 : 0 }}>
            <TouchableOpacity
                style={{ position: 'absolute', bottom: 0, right: 10, zIndex: 1, backgroundColor: colors.background, borderWidth: 1, borderStyle: 'solid', borderColor: colors.border, borderRadius: 20, padding: 10, paddingLeft: 20, paddingRight: 20 }}
                onPress={async () => {
                    navigation.push('entry', { id: undefined });
                }}><Text style={{ fontSize: 20 }}>add entry +</Text></TouchableOpacity>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: root.desktopWeb ? 'center' : 'space-between', marginBottom: -35, marginTop: 5, zIndex: 1, paddingLeft: 10, paddingRight: 10 }}>
                <Text style={{ color: colors.text, fontSize: 20, marginRight: root.desktopWeb ? 10 : 0, fontWeight: '600' }}>{new Date(month).toLocaleDateString('en-US', { month: 'long' }).toLowerCase()} {new Date(month).getFullYear()}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => { setShowEntries(!showEntries) }} style={{ flexDirection: 'row', marginLeft: 10 }}>
                        <View
                            style={{ width: 20, height: 20, borderRadius: 5, borderWidth: showEntries ? 0 : 1, borderColor: '#767676', flexDirection: 'row', marginLeft: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: showEntries ? '#0075ff' : '#ffffff' }}>
                            {showEntries && <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 20 }}>✓</Text>}
                        </View>
                        <Text style={{ marginLeft: 5 }}>entries</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setShowTasks(!showTasks) }} style={{ flexDirection: 'row', marginLeft: 10 }}>
                        <View
                            style={{ width: 20, height: 20, borderRadius: 5, borderWidth: showTasks ? 0 : 1, borderColor: '#767676', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: showTasks ? '#0075ff' : '#ffffff' }}>
                            {showTasks && <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 20 }}>✓</Text>}
                        </View>
                        <Text style={{ marginLeft: 5 }}>tasks</Text>
                    </TouchableOpacity>
                </View>
            </View>
            <ScrollView
                scrollEnabled={root.desktopWeb ? false : true}
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                    if (e.nativeEvent.contentOffset.x === 0) {
                        const innerMonth = new Date(month);
                        innerMonth.setMonth(innerMonth.getMonth() - 1);
                        month = innerMonth.toLocaleDateString('fr-CA');
                        onRefresh();
                    }
                    else if (e.nativeEvent.contentOffset.x >= windowDimensions.width * 2) {
                        const innerMonth = new Date(month);
                        innerMonth.setMonth(innerMonth.getMonth() + 1);
                        month = innerMonth.toLocaleDateString('fr-CA');
                        onRefresh();
                    }
                }}
                ref={scrollRef}
                pagingEnabled={true}
                horizontal={true}
                style={{ width: windowDimensions.width, height: root.desktopWeb ? windowDimensions.height : '100%', alignSelf: 'center' }}
                contentContainerStyle={{ display: 'flex', alignItems: 'flex-start', width: windowDimensions.width * 3 }}
                automaticallyAdjustContentInsets={false}
                directionalLockEnabled={true}
                decelerationRate={0.999999}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshControl}
                        onRefresh={() => onRefresh(true)}
                        colors={[colors.text]}
                        tintColor={colors.text}
                        titleColor={colors.text}
                        title=""
                    />}
            >
                <GhostCalendar />
                <CustomCalendar givenMonth={month} />
                <GhostCalendar />
            </ScrollView>
        </View >
    );
}