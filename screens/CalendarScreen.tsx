import React, { useState } from 'react';
import { Text, View } from '../components/Themed';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { RefreshControl, ScrollView, TouchableOpacity, Alert } from 'react-native';
import * as root from '../Root';
import { API, graphqlOperation } from 'aws-amplify';
import { useFocusEffect } from '@react-navigation/native';
import { LoadingComponent } from '../components/LoadingComponent';
import Popover from '../components/PopoverMenuRenderer';

LocaleConfig.locales['en'] = {
    monthNames: ['January', 'Februrary', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    monthNamesShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'],
    dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Saturday', 'Sunday'],
    dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
};
LocaleConfig.defaultLocale = 'en';

// somewhere in your app
import {
    Menu,
    MenuOptions,
    MenuOption,
    MenuTrigger,
} from 'react-native-popup-menu';
import { State } from 'react-native-gesture-handler';

export default function CalendarScreen({ route, navigation }: any) {
    const [rootState, setRootState] = useState({
        timesheets: [],
        markedDays: [],
        loading: false
    });

    useFocusEffect(
        React.useCallback(() => {
            console.log("FOCUS!");
            onRefresh();
        }, [])
    );

    let onRefresh = async () => {
        setRootState({ ...rootState, loading: true });
        let data = await API.graphql(graphqlOperation(`
        {
            timesheets(order_by: {date: asc}) {
              project {
                name
                key
                color
              }
              hours
              details
              date
              id
            }
        }          
        `));
        setRootState({ ...rootState, loading: false, timesheets: data.data.timesheets });
    }
    return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            {root.desktopWeb ?
                <View style={{ height: 50 }} />
                :
                <View style={{ paddingTop: 40, paddingBottom: 10 }}>
                    <Text>Timesheet</Text>
                </View>}
            <ScrollView
                style={{ maxWidth: 800, width: '100%', height: '100%', padding: 10 }}
                contentContainerStyle={{ display: 'flex', alignItems: 'center' }}
                refreshControl={
                    <RefreshControl
                        refreshing={rootState.loading}
                        onRefresh={onRefresh}
                        colors={["#ffffff"]}
                        tintColor='#ffffff'
                        titleColor="#ffffff"
                        title=""
                    />}
            >
                {!rootState.loading && <CalendarCustom rootState={rootState} navigation={navigation} onRefresh={onRefresh} />}
                {rootState.loading && <CalendarCustom rootState={rootState} navigation={navigation} onRefresh={onRefresh} />}
            </ScrollView>
            {rootState.loading && <LoadingComponent />}
        </View>
    );
}

function CalendarCustom(props: any) {
    let rootState = props.rootState;
    let navigation = props.navigation;
    let onRefresh = props.onRefresh;
    return (
        <Calendar
            style={{ width: root.desktopWeb ? 'unset' : root.windowWidth }}
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
            markedDates={rootState.markedDates}
            hideExtraDays={true}
            onMonthChange={(month) => { console.log('month changed', month) }}
            renderArrow={(direction) => (<Text>{direction === 'left' ? '←' : '→'}</Text>)}
            firstDay={0}
            onPressArrowLeft={subtractMonth => subtractMonth()}
            onPressArrowRight={addMonth => addMonth()}
            dayComponent={({ date, state }) => {
                return (
                    <View style={[
                        { borderWidth: 1, borderColor: '#ffffff', borderStyle: 'solid', marginBottom: -15, marginLeft: root.desktopWeb ? -1 : 0 },
                        root.desktopWeb ? { width: 100, height: 100 } :
                            { width: root.windowWidth / 7, height: 100 }
                    ]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text style={{ margin: 5, textAlign: 'left', color: state === 'disabled' ? '#aaaaaa' : '#ffffff', fontSize: 12 }}>
                                {date.day}
                            </Text>
                            <TouchableOpacity onPress={() => { navigation.navigate('entry', { date: date.dateString }); }} style={{ paddingRight: 3 }}><Text style={{ color: '#aaaaaa' }}>+</Text></TouchableOpacity>
                        </View>
                        {rootState.timesheets.filter(timesheet => timesheet.date === date.dateString).map((obj, index) => {
                            if (index < 4) {
                                return (
                                    <Menu key={index} renderer={Popover} rendererProps={{ anchorStyle: { backgroundColor: '#000000', borderColor: '#ffffff', borderWidth: 1, borderStyle: 'solid' } }} >
                                        <MenuTrigger>
                                            <View style={{ paddingLeft: 2, paddingRight: 2, backgroundColor: obj.project.color, width: '100%', height: root.desktopWeb ? 18 : 19, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <Text numberOfLines={1} style={{ fontSize: 12 }}>{root.desktopWeb ? obj.project.name : obj.project.key}</Text>
                                                <Text numberOfLines={1} style={{ fontSize: 12, minWidth: obj.hours.toString().length * 6 }}>{obj.hours}</Text>
                                            </View>
                                        </MenuTrigger>
                                        <MenuOptions customStyles={{
                                            optionsWrapper: { backgroundColor: '#000000', borderColor: '#ffffff', borderWidth: 1, borderStyle: 'solid', width: 200 }
                                        }}>
                                            <Text style={{ margin: 5 }}>{obj.project.name} - {obj.hours} hrs</Text>
                                            <Text style={{ margin: 5 }}>{obj.details}</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 5, width: '100%' }}>
                                                <TouchableOpacity style={{ backgroundColor: '#3F0054', padding: 5, width: '50%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }} onPress={async () => {
                                                    await API.graphql(graphqlOperation(`
                                                                mutation {
                                                                    delete_timesheets_by_pk(id: "${obj.id}") {
                                                                        id
                                                                    }
                                                                }
                                                                `));
                                                    onRefresh();
                                                }}><Text>Delete</Text></TouchableOpacity>
                                                <TouchableOpacity style={{ backgroundColor: '#3F91A1', padding: 5, width: '50%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }} onPress={() => { navigation.navigate('entry', { id: obj.id }) }} ><Text>Edit</Text></TouchableOpacity>
                                            </View>
                                        </MenuOptions>
                                    </Menu>
                                )
                            }
                        })}
                    </View>
                );
            }}
        />
    )
}