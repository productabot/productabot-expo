import React, { useState, useEffect } from 'react';
import { Text, View } from '../components/Themed';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { RefreshControl, ScrollView, TouchableOpacity, Alert, useWindowDimensions, SafeAreaView } from 'react-native';
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

import { Menu, MenuOptions, MenuTrigger } from 'react-native-popup-menu';

export default function CalendarScreen({ route, navigation, refresh }: any) {
    const window = useWindowDimensions();
    const [loading, setLoading] = useState(false);
    const [timesheets, setTimesheets] = useState([]);
    const [month, setMonth] = useState(new Date().toLocaleDateString('fr-CA'));

    useFocusEffect(
        React.useCallback(() => {
            if (!route.params) { route.params = {}; }
            onRefresh();
        }, [refresh, month])
    );

    let onRefresh = async (showLoader = false) => {
        showLoader && setLoading(true);

        let lastMonth = new Date(month);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        let nextMonth = new Date(month);
        nextMonth.setMonth(nextMonth.getMonth() + 2);
        let data = await API.graphql(graphqlOperation(`
        {
            timesheets(order_by: {date: asc, project: {name: asc}, hours: desc}, where: {date: {_gte: "${lastMonth.toLocaleDateString('fr-CA').substr(0, 7)}-23", _lt: "${nextMonth.toLocaleDateString('fr-CA').substr(0, 7)}-07"}}) {
              project {
                name
                key
                color
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
        showLoader && setLoading(false);
    }

    return (
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: root.desktopWeb ? 30 : 0 }}>
            <ScrollView
                style={{ maxWidth: Math.min(root.desktopWidth, window.width), height: '100%', padding: 10 }}
                contentContainerStyle={{ display: 'flex', alignItems: 'center' }}
                refreshControl={
                    <RefreshControl
                        refreshing={loading}
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
                        return (
                            <ScrollView style={[
                                { borderWidth: 1, borderColor: '#444444', borderStyle: 'solid', marginBottom: -15, marginLeft: 0 },
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
                                    <Menu key={index} renderer={Popover} rendererProps={{ anchorStyle: { backgroundColor: '#000000', borderColor: '#ffffff', borderWidth: 1, borderStyle: 'solid' } }} >
                                        <MenuTrigger>
                                            <View style={{ paddingLeft: 2, paddingRight: 2, backgroundColor: obj.project.color, width: '100%', height: root.desktopWeb ? 17 : 19, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <Text numberOfLines={1} style={{ fontSize: 12 }}>{root.desktopWeb ? obj.project.name : obj.project.key}</Text>
                                                <Text numberOfLines={1} style={{ fontSize: 12, minWidth: obj.hours.toString().length * 6 }}>{obj.hours}</Text>
                                            </View>
                                        </MenuTrigger>
                                        <MenuOptions customStyles={{
                                            optionsWrapper: { backgroundColor: '#000000', borderColor: '#ffffff', borderWidth: 1, borderStyle: 'solid', width: 200 }
                                        }}>
                                            <ScrollView style={{ maxHeight: 200, paddingBottom: 5 }}>
                                                <Text style={{ margin: 5 }}>{obj.project.name}{obj.category ? ' - ' + obj.category : ''} - {obj.hours} hrs</Text>
                                                <Text style={{ margin: 5 }}>{obj.details}</Text>
                                            </ScrollView>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
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
                                                <TouchableOpacity style={{ backgroundColor: '#3F91A1', padding: 5, width: '50%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }} onPress={() => {
                                                    onRefresh(); navigation.navigate('entry', { id: obj.id, date: undefined })
                                                }} ><Text>Edit</Text></TouchableOpacity>
                                            </View>
                                        </MenuOptions>
                                    </Menu>
                                )}
                            </ScrollView>
                        );
                    }}
                />
            </ScrollView>
            {loading && <LoadingComponent />}
        </SafeAreaView>
    );
}