import React, { useState, useRef } from 'react';
import { Text, View } from '../components/Themed';
import { RefreshControl, ScrollView, TouchableOpacity, Image, Platform, Alert, Animated, Easing } from 'react-native';
import * as root from '../Root';
import { API, graphqlOperation } from "@aws-amplify/api";
import { useFocusEffect } from '@react-navigation/native';
import Popover from '../components/PopoverMenuRenderer';
import { Menu, MenuOptions, MenuTrigger } from 'react-native-popup-menu';
import { useTheme } from '@react-navigation/native';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { format, parse, startOfWeek, getDay } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import ContextMenuRenderer from '../components/ContextMenuRenderer';
const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales: {
        'en-US': enUS,
    }
});

let currentDate = new Date();
let startDate = new Date();
startDate.setDate(24);
startDate.setMonth(startDate.getMonth() - 1);
let endDate = new Date();
endDate.setDate(7);
endDate.setMonth(endDate.getMonth() + 1);
const DragAndDropCalendar = withDragAndDrop(Calendar); //, { backend: false }

export default function CalendarScreen({ route, navigation, refresh, setLoading }: any) {
    const [entries, setEntries] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [events, setEvents] = useState([]);
    const { colors } = useTheme();
    const [showEntries, setShowEntries] = useState(true);
    const [showTasks, setShowTasks] = useState(true);
    const [showEvents, setShowEvents] = useState(true);
    const menuRef = useRef(null);
    const addMenuRef = useRef(null);
    const contextMenuRef = useRef(null);
    const [event, setEvent] = useState({ project: {}, x: 0, y: 0 });

    useFocusEffect(
        React.useCallback(() => {
            if (!route.params) { route.params = {}; }
            onRefresh();
        }, [refresh, route.params])
    );

    let onRefresh = async () => {
        setLoading(true);
        currentDate = new Date(startDate);
        if (currentDate.getDate() !== 1) { currentDate.setDate(1); currentDate.setMonth(currentDate.getMonth() + 1); }
        // console.log(startDate, endDate);
        let data = await API.graphql(graphqlOperation(`
        {
            entries(order_by: {date: asc, project: {name: asc}, hours: desc}, where: {date: {_gte: "${startDate.toLocaleDateString('fr-CA')}", _lt: "${endDate.toLocaleDateString('fr-CA')}"}}) {
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
            tasks(order_by: {date: asc, time: asc, project: {name: asc}}, where: {date: {_gte: "${startDate.toLocaleDateString('fr-CA')}", _lt: "${endDate.toLocaleDateString('fr-CA')}"}}) {
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
            events(order_by: {date_from: asc, project: {name: asc}}, where: {date_from: {_gte: "${startDate.toLocaleDateString('fr-CA')}", _lt: "${endDate.toLocaleDateString('fr-CA')}"}}) {
              project {
                id
                name
                key
                color
                image
              }
              category
              details
              date_from
              date_to
              id
            }
        }          
        `));
        setEntries(data.data.entries.map(obj => { return { ...obj, start: new Date(obj.date + 'T12:00'), end: new Date(obj.date + 'T12:01'), title: `⏱${obj.project?.name} - ${obj.hours} hrs`, allDay: true, type: 'entry' } }));
        setTasks(data.data.tasks.map(obj => { return { ...obj, start: new Date(obj.date + 'T12:00'), end: new Date(obj.date + 'T12:01'), title: ` ☉ ${obj.details}${obj.time ? ' @ ' + new Date(obj.date + 'T' + obj.time).toLocaleTimeString([], { timeStyle: 'short' }).replace(' ', '').toLowerCase() : ''}`, allDay: true, type: 'task' } }));
        setEvents(data.data.events.map(obj => { return { ...obj, start: new Date(obj.date_from + 'T12:00'), end: new Date(obj.date_to + 'T12:01'), title: `📅 ${obj.details}`, allDay: true, type: 'event' } }));
        setLoading(false);
    }


    const moveEntry = async ({ event, start, end }) => {
        if (event.type === 'entry') {
            const idx = entries.indexOf(event);
            const updatedEntry = { ...event, start, end };
            const nextEntries = [...entries];
            nextEntries.splice(idx, 1, updatedEntry);
            setEntries(nextEntries);
            await API.graphql(graphqlOperation(`mutation {
                update_entries_by_pk(pk_columns: {id: "${event.id}"}, _set: {date: "${start.toISOString().split('T')[0]}"}) {id}
            }`));
        }
        else if (event.type === 'task') {
            const idx = tasks.indexOf(event);
            const updatedTask = { ...event, start, end };
            const nextTasks = [...tasks];
            nextTasks.splice(idx, 1, updatedTask);
            setTasks(nextTasks);
            await API.graphql(graphqlOperation(`mutation {
                update_tasks_by_pk(pk_columns: {id: "${event.id}"}, _set: {date: "${start.toISOString().split('T')[0]}"}) {id}
            }`));
        }
        else if (event.type === 'event') {
            const idx = events.indexOf(event);
            const updatedEvent = { ...event, start, end };
            const nextEvents = [...events];
            nextEvents.splice(idx, 1, updatedEvent);
            setEvents(nextEvents);
            await API.graphql(graphqlOperation(`mutation {
                update_events_by_pk(pk_columns: {id: "${event.id}"}, _set: {date_from: "${start.toISOString().split('T')[0]}", date_to: "${end.toISOString().split('T')[0]}"}) {id}
            }`));
        }
    }

    const resizeEntry = async ({ event, start, end }) => {
        if (event.type === 'entry') {
            const nextEntries = entries.map(existingEvent => {
                return existingEvent.id == event.id
                    ? { ...existingEvent, start, end: start }
                    : existingEvent;
            });
            setEntries(nextEntries);
            await API.graphql(graphqlOperation(`mutation {
                update_entries_by_pk(pk_columns: {id: "${event.id}"}, _set: {date: "${start.toISOString().split('T')[0]}"}) {id}
            }`));
        }
        else if (event.type === 'task') {
            const nextTasks = tasks.map(existingEvent => {
                return existingEvent.id == event.id
                    ? { ...existingEvent, start, end: start }
                    : existingEvent;
            });
            setTasks(nextTasks);
            await API.graphql(graphqlOperation(`mutation {
                update_tasks_by_pk(pk_columns: {id: "${event.id}"}, _set: {date: "${start.toISOString().split('T')[0]}"}) {id}
            }`));
        }
        else if (event.type === 'event') {
            const nextEvents = events.map(existingEvent => {
                return existingEvent.id == event.id
                    ? { ...existingEvent, start, end }
                    : existingEvent;
            });
            setEvents(nextEvents);
            await API.graphql(graphqlOperation(`mutation {
                update_events_by_pk(pk_columns: {id: "${event.id}"}, _set: {date_from: "${start.toISOString().split('T')[0]}", date_to: "${end.toISOString().split('T')[0]}"}) {id}
            }`));
        }
    };

    const selectEvent = async (event, e) => {
        // setEvent({ ...event, x: e.clientX, y: e.clientY });
        // setTimeout(() => { menuRef.current.open() }, 0);
        navigation.push(event.type, { id: event.id });
    }

    return (
        <div style={{ paddingTop: 50, margin: 5 }}>
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: -28 }}>
                <div style={{ fontFamily: 'arial', color: colors.text, fontSize: 20, marginRight: 10, fontWeight: 'bold', marginTop: 3 }}>{new Date(currentDate).toLocaleDateString('en-US', { month: 'long' }).toLowerCase()} {new Date(currentDate).getFullYear()}</div>
                <TouchableOpacity onPress={() => { setShowEntries(!showEntries) }} style={{ flexDirection: 'row', marginLeft: 10 }}>
                    {Platform.OS === 'web' ? <input checked={showEntries} style={{ width: 20, height: 20, margin: 0 }} type="checkbox" /> : <View
                        style={{ width: 20, height: 20, borderRadius: 5, borderWidth: showEntries ? 0 : 1, borderColor: '#767676', flexDirection: 'row', marginLeft: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: showEntries ? '#0075ff' : '#ffffff' }}>
                        {showEntries && <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 20 }}>✓</Text>}
                    </View>}
                    <Text style={{ marginLeft: 5 }}>entries</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setShowTasks(!showTasks) }} style={{ flexDirection: 'row', marginLeft: 10 }}>
                    {Platform.OS === 'web' ? <input checked={showTasks} style={{ width: 20, height: 20, margin: 0 }} type="checkbox" /> : <View
                        style={{ width: 20, height: 20, borderRadius: 5, borderWidth: showTasks ? 0 : 1, borderColor: '#767676', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: showTasks ? '#0075ff' : '#ffffff' }}>
                        {showTasks && <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 20 }}>✓</Text>}
                    </View>}
                    <Text style={{ marginLeft: 5 }}>tasks</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setShowEvents(!showEvents) }} style={{ flexDirection: 'row', marginLeft: 10 }}>
                    {Platform.OS === 'web' ? <input checked={showEvents} style={{ width: 20, height: 20, margin: 0 }} type="checkbox" /> : <View
                        style={{ width: 20, height: 20, borderRadius: 5, borderWidth: showEvents ? 0 : 1, borderColor: '#767676', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: showEvents ? '#0075ff' : '#ffffff' }}>
                        {showEvents && <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 20 }}>✓</Text>}
                    </View>}
                    <Text style={{ marginLeft: 5 }}>events</Text>
                </TouchableOpacity>
            </div>
            <DragAndDropCalendar
                localizer={localizer}
                views={['month']}
                toolbar={true}
                popup={true}
                // onDragStart={(event) => { console.log(event); }}
                onSelectEvent={selectEvent}
                onEventDrop={moveEntry}
                resizable={true}
                onEventResize={resizeEntry}
                events={[...(showEntries ? entries : []), ...(showTasks ? tasks : []), ...(showEvents ? events : [])]}
                style={{ height: 'calc(100vh - 60px)', color: colors.text, fontFamily: 'arial' }}
                eventPropGetter={(event) => {
                    const date = new Date();
                    date.setDate(date.getDate() - 1);
                    const fade = new Date(event.date + 'T12:00') < date ? (colors.background === '#000000' ? '66' : '99') : '';
                    return { style: { backgroundColor: event.project?.color + fade, color: '#ffffff' + fade, fontSize: 12, textDecorationLine: event.status === 'done' ? 'line-through' : '' } }
                }}
                onRangeChange={({ start, end }) => {
                    if (start && end) {
                        startDate = start;
                        endDate = end;
                    }
                    onRefresh();
                }}
                components={{
                    dateCellWrapper: ({ value }) => {
                        return (
                            <div onClick={(e) => {
                                setEvent({ ...event, x: e.clientX, y: e.clientY, date: value }); addMenuRef.current.open();
                            }} style={{ width: '100%', height: '100%', borderRight: '1px solid #66666666', cursor: 'pointer', position: 'relative', zIndex: 4 }} />
                        )
                    },
                    month: {
                        event: ({ event, title }) => {
                            return (<div onContextMenu={async (e) => {
                                e.preventDefault();
                                setEvent({
                                    ...event, x: e.clientX, y: e.clientY, edit: () => { navigation.push(event.type, { id: event.id, date: undefined }) }, delete: async () => {
                                        const deleteFunction = async () => {
                                            setLoading(true);
                                            await API.graphql(graphqlOperation(`mutation {delete_${event.type === 'entry' ? 'entries' : event.type === 'task' ? 'tasks' : 'events'}_by_pk(id: "${event.id}") {id}}`));
                                            await onRefresh();
                                            setLoading(false);
                                            contextMenuRef.current.close();
                                        }
                                        if (Platform.OS !== 'web') {
                                            Alert.alert('Warning', `Are you sure you want to delete this ${event.type}?`,
                                                [{ text: "No", style: "cancel" }, { text: "Yes", style: "destructive", onPress: async () => { await deleteFunction(); } }]);
                                        }
                                        else if (confirm(`Are you sure you want to delete this ${event.type}?`)) { await deleteFunction() }
                                    }
                                });
                                contextMenuRef.current.open();
                            }} style={{ position: 'relative', zIndex: 100 }}>{title}</div>)
                        },
                        dateHeader: ({ date, label }) => {
                            let givenDate = date.toDateString();
                            let currentDate = new Date().toDateString();
                            return (
                                <div onClick={(e) => {
                                    setEvent({ ...event, x: e.clientX, y: e.clientY, date: date }); addMenuRef.current.open();
                                }} style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', cursor: 'pointer', padding: 2 }}>
                                    <div style={{ fontSize: 12, marginLeft: 4 }}>{label}</div>
                                    <div style={{ fontSize: 12, color: givenDate === currentDate ? colors.text : '#aaaaaa' }}>+</div>
                                </div>)
                        }
                    }
                }}
            />


            <Menu style={{ position: 'absolute', left: 0, top: 0 }} ref={menuRef} renderer={Popover}>
                <MenuTrigger customStyles={{ triggerOuterWrapper: { top: event.y, left: event.x } }} />
                <MenuOptions customStyles={{
                    optionsWrapper: { backgroundColor: 'transparent', width: 300 },
                    optionsContainer: { backgroundColor: 'transparent', shadowOpacity: 0 },
                }}>
                    <View style={{ backgroundColor: colors.background, borderColor: '#666666', borderWidth: 1, borderStyle: 'solid', width: 300, borderRadius: 10 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 5, width: '100%' }}>
                            <TouchableOpacity onPress={() => { menuRef.current.close(); navigation.push('project', { id: event.project?.id }); }} style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center' }}>
                                <Image style={{ height: 35, width: 35, borderRadius: 5, borderColor: colors.text, borderWidth: 1 }} source={{ uri: `https://files.productabot.com/public/${event.project?.image}` }} />
                                <View style={{ flexDirection: 'column', marginLeft: 5 }}>
                                    <Text numberOfLines={1} style={{ color: colors.text, marginLeft: 3 }}>{event.project?.name}</Text>
                                    <View style={{ flexDirection: 'row' }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#444444', borderRadius: 5, paddingLeft: 5, paddingRight: 5, paddingTop: 0, paddingBottom: 0 }}>
                                            <Text numberOfLines={1} style={{ color: '#ffffff', fontSize: 12 }}>{event.category}</Text>
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                            {event.type === 'entry' && <Text numberOfLines={1} style={{ color: colors.text, fontSize: 30, fontWeight: 'bold' }}>⏱{event.hours}<Text numberOfLines={1} style={{ color: colors.text, fontSize: 16, fontWeight: 'normal' }}> hrs</Text></Text>}
                            {event.type === 'task' && <Text numberOfLines={1} style={{ color: colors.text, fontSize: 30, fontWeight: 'bold' }}>☉</Text>}
                            {event.type === 'event' && <Text numberOfLines={1} style={{ color: colors.text, fontSize: 30, fontWeight: 'bold' }}>📅</Text>}
                        </View>
                        <Text style={{ color: colors.text, margin: 5 }}>{event.details}{event.time ? ' @ ' + new Date(event.date + 'T' + event.time).toLocaleTimeString([], { timeStyle: 'short' }).replace(' ', '').toLowerCase() : ''}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                            <TouchableOpacity style={{ backgroundColor: '#3F0054', padding: 5, width: '50%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderBottomLeftRadius: 9 }} onPress={async () => {
                                const deleteFunction = async () => {
                                    setLoading(true);
                                    await API.graphql(graphqlOperation(`mutation {delete_${event.type === 'entry' ? 'entries' : event.type === 'task' ? 'tasks' : 'events'}_by_pk(id: "${event.id}") {id}}`));
                                    await onRefresh();
                                    setLoading(false);
                                    menuRef.current.close();
                                }
                                if (Platform.OS !== 'web') {
                                    Alert.alert('Warning', `Are you sure you want to delete this ${event.type}?`,
                                        [{ text: "No", style: "cancel" }, { text: "Yes", style: "destructive", onPress: async () => { await deleteFunction(); } }]);
                                }
                                else if (confirm(`Are you sure you want to delete this ${event.type}?`)) { await deleteFunction() }
                            }}><Text style={{ color: '#ffffff' }}>Delete</Text></TouchableOpacity>
                            <TouchableOpacity style={{ backgroundColor: '#3F91A1', padding: 5, width: '50%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderBottomRightRadius: 9 }} onPress={() => {
                                menuRef.current.close(); navigation.push(event.type, { id: event.id, date: undefined })
                            }} ><Text style={{ color: '#ffffff' }}>Edit</Text></TouchableOpacity>
                        </View>
                    </View>
                </MenuOptions>
            </Menu>

            <Menu style={{ position: 'absolute', left: 0, top: 0 }} ref={addMenuRef} renderer={Popover}>
                <MenuTrigger customStyles={{ triggerOuterWrapper: { top: event.y, left: event.x } }} />
                <MenuOptions customStyles={{
                    optionsWrapper: { backgroundColor: 'transparent', width: 300 },
                    optionsContainer: { backgroundColor: 'transparent', shadowOpacity: 0 },
                }}>
                    <View style={{ backgroundColor: colors.background, borderColor: '#666666', borderWidth: 1, borderStyle: 'solid', width: 300, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', height: 40 }}>
                        <TouchableOpacity onPress={() => { addMenuRef.current.close(); navigation.push('entry', { date: event.date.toISOString().split('T')[0], id: undefined }); }} style={{ width: '33.3333%', height: '100%', backgroundColor: '#3F0054', borderTopLeftRadius: 9, borderBottomLeftRadius: 9, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: '#ffffff', textAlign: 'center' }}>⏱ add entry</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => { addMenuRef.current.close(); navigation.push('edit_task', { date: event.date.toISOString().split('T')[0], id: undefined, status: 'backlog' }); }} style={{ width: '33.3333%', height: '100%', backgroundColor: '#3F91A1', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: '#ffffff', textAlign: 'center' }}>☉ add task</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => { addMenuRef.current.close(); navigation.push('event', { date_from: event.date.toISOString().split('T')[0], date_to: event.date.toISOString().split('T')[0], id: undefined }); }} style={{ width: '33.3333%', height: '100%', backgroundColor: '#000000', borderTopRightRadius: 9, borderBottomRightRadius: 9, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: '#ffffff', textAlign: 'center' }}>📅 add event</Text></TouchableOpacity>
                    </View>
                </MenuOptions>
            </Menu>

            <Menu style={{ position: 'absolute', left: 0, top: 0 }} ref={contextMenuRef} renderer={ContextMenuRenderer} >
                <MenuTrigger customStyles={{ triggerOuterWrapper: { top: event.y, left: event.x } }} />
                <MenuOptions style={{ flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', backgroundColor: colors.background, borderColor: colors.text, borderWidth: 1, borderStyle: 'solid', borderRadius: 10, width: 100, paddingLeft: 15, paddingTop: 5, paddingBottom: 5 }}>
                    {event.edit && <TouchableOpacity style={{ padding: 5, width: '100%' }} onPress={async () => {
                        contextMenuRef.current.close();
                        await event.edit();
                    }} ><Text style={{ color: colors.text }}>Edit</Text></TouchableOpacity>}
                    {event.delete && <TouchableOpacity style={{ padding: 5, width: '100%' }} onPress={async () => {
                        contextMenuRef.current.close();
                        await event.delete();
                    }}><Text style={{ color: colors.delete }}>Delete</Text></TouchableOpacity>}
                    <TouchableOpacity style={{ padding: 5, width: '100%' }}
                        onPress={() => { contextMenuRef.current.close(); }}><Text style={{ color: colors.text }}>Cancel</Text></TouchableOpacity>
                </MenuOptions>
            </Menu>
        </div >
    );
}