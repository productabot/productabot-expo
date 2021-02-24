import React, { useState, useEffect } from 'react';
import { Text, View } from '../components/Themed';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { RefreshControl, ScrollView, TouchableOpacity, Alert } from 'react-native';
import * as root from '../Root';
import { API, graphqlOperation } from 'aws-amplify';
import { useFocusEffect } from '@react-navigation/native';
import { LoadingComponent } from '../components/LoadingComponent';

LocaleConfig.locales['en'] = {
    monthNames: ['January', 'Februrary', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    monthNamesShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'],
    dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Saturday', 'Sunday'],
    dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
};
LocaleConfig.defaultLocale = 'en';

export default function CalendarScreen({ route, navigation }: any) {
    const [rootState, setRootState] = useState({
        timesheets: [],
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
              }
              hours
              details
              date
              id
            }
        }          
        `));
        setRootState({ ...rootState, loading: false, timesheets: data.data.timesheets.length > 0 ? data.data.timesheets : [{ date: '1995-02-10', project: { name: '' } }] });
    }
    return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            {root.desktopWeb ?
                <View style={{ height: 50 }} />
                :
                <View style={{ paddingTop: 40, paddingBottom: 10 }}>
                    <Text>Calendar</Text>
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
                {rootState.timesheets.length > 0 && <Calendar
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
                    hideExtraDays={true}
                    onMonthChange={(month) => { console.log('month changed', month) }}
                    renderArrow={(direction) => (<Text>{direction === 'left' ? '<' : '>'}</Text>)}
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
                                            <TouchableOpacity onLongPress={() => {
                                                Alert.alert('Delete Entry', 'Are you sure you want to delete this entry?',
                                                    [
                                                        { text: 'Cancel' },
                                                        {
                                                            text: 'Delete', onPress: () => {
                                                                API.graphql(graphqlOperation(`
                                                                mutation {
                                                                    delete_timesheets_by_pk(id: "${obj.id}") {
                                                                        id
                                                                    }
                                                                }
                                                                `));
                                                                onRefresh();
                                                            }, style: 'destructive'
                                                        }
                                                    ],
                                                    { cancelable: true },
                                                );
                                            }} key={index} style={{ paddingLeft: 2, paddingRight: 2, backgroundColor: '#ff0000', width: '100%', height: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <Text numberOfLines={1} style={{ fontSize: 12 }}>{root.desktopWeb ? obj.project.name : obj.project.key}</Text>
                                                <Text numberOfLines={1} style={{ fontSize: 12 }}>{obj.hours}</Text>
                                            </TouchableOpacity>
                                        )
                                    }
                                })}
                            </View>
                        );
                    }}
                />}
            </ScrollView>
            {rootState.loading && <LoadingComponent />}
        </View >
    );
}