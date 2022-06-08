import React, { useState, useEffect } from 'react';
import { FlatList, TouchableOpacity, TextInput, Platform, KeyboardAvoidingView, Keyboard, useWindowDimensions, Text, Image } from 'react-native';
import { View } from '../components/Themed';
import { useTheme, useFocusEffect } from '@react-navigation/native';
import * as root from '../Root';
import { API, graphqlOperation } from "@aws-amplify/api";
import { compressUuid } from '../scripts/uuid';

export default function SearchScreen({ route, navigation, setLoading }: any) {
    const windowDimensions = useWindowDimensions();
    const { colors } = useTheme();
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => { searchTerm.length > 0 ? search(searchTerm) : setResults([]) }, [searchTerm])

    const search = async (givenTerm) => {
        let data = await API.graphql(graphqlOperation(`{
            projects(where: {name: {_ilike: "%${givenTerm}%"}}, limit: 10) {
                id
                name
                image
                description
            }
            tasks(where: {details: {_ilike: "%${givenTerm}%"}}, limit: 10) {
                id
                details
                project {
                    image
                }
                created_at
                date
                category
            }
        }`));
        setSelectedIndex(0);
        setResults(
            ['projects', 'tasks'].map(obj => {
                return data.data[obj].map(
                    innerObj => { return { ...innerObj, type: obj } }
                )
            }).reduce((a, b) => [...a, ...b])
        );
    }

    return (
        <View style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingTop: root.desktopWeb ? 70 : 0
        }}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ height: '100%', width: root.desktopWeb ? Math.min(800, windowDimensions.width - 40) : windowDimensions.width, padding: root.desktopWeb ? 0 : 10 }}
            >
                <TextInput clearButtonMode="always" autoFocus={true} value={searchTerm} onChangeText={(value) => setSearchTerm(value)} placeholder="start typing to search" placeholderTextColor={colors.placeholder} style={{ color: colors.text, fontSize: 30, width: '100%', borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 10 }}
                    onKeyPress={(e) => {
                        if (e.keyCode == '40') { //down
                            e.preventDefault();
                            if (selectedIndex !== results.length - 1) {
                                setSelectedIndex(selectedIndex + 1)
                            }
                        }
                        if (e.keyCode == '38') { //up
                            e.preventDefault();
                            if (selectedIndex !== 0) {
                                setSelectedIndex(selectedIndex - 1);
                            }
                        }
                        if (e.nativeEvent.key === 'Enter') {
                            navigation.navigate(results[selectedIndex].type.slice(0, -1), { id: results[selectedIndex].id })
                        }
                    }} />
                <FlatList
                    data={results}
                    style={{ height: windowDimensions.height - 200 }}
                    renderItem={({ item, index }) =>
                        <TouchableOpacity
                            onPress={(e) => { e.preventDefault(); navigation.navigate(item.type.slice(0, -1), { id: item.id }) }}
                            style={{ height: 60, padding: 10, margin: 5, backgroundColor: colors.card, borderRadius: 10, flexDirection: 'row', justifyContent: 'flex-start', borderWidth: index === selectedIndex ? 1 : 0, borderColor: colors.border }}
                            href={`/${item.type}/${compressUuid(item.id)}`}
                        >
                            {item.type === 'projects' && <>
                                <View style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginRight: 7 }}>
                                    <Image style={{ height: 30, width: 30, borderRadius: 5, borderColor: colors.text, borderWidth: 1 }} source={{ uri: `https://files.productabot.com/public/${item.image}` }} />
                                </View>
                                <View style={{ flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', maxWidth: '100%' }}>
                                    <Text style={{ color: colors.text, fontSize: 26 }}>{item.name ? item.name : ' '}</Text>
                                    <Text style={{ color: colors.text, fontSize: 14, marginTop: -3 }}>{item.description ? item.description : ' '}</Text>
                                </View></>}
                            {item.type === 'tasks' && <>
                                <View style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginRight: 7 }}>
                                    <Image style={{ height: 30, width: 30, borderRadius: 5, borderColor: colors.text, borderWidth: 1 }} source={{ uri: `https://files.productabot.com/public/${item.project?.image}` }} />
                                </View>
                                <View style={{ flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', maxWidth: '100%' }}>
                                    {item.date ?
                                        <Text style={{ color: '#ffffff', fontSize: 10, textAlign: 'left', marginTop: 5, backgroundColor: '#3F0054', paddingLeft: 2, paddingRight: 2, borderRadius: 5 }}>
                                            <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: 'bold' }}>due </Text>
                                            {`${new Date(item.date + 'T12:00:00.000Z').toLocaleString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })}${item.time ? `, ${new Date(item.date + 'T' + item.time).toLocaleTimeString([], { timeStyle: 'short' }).replace(' ', '').toLowerCase()}` : ``}`}</Text>
                                        :
                                        <Text style={{ color: '#aaaaaa', fontSize: 10, textAlign: 'left', marginTop: 5 }}>{item.created_at ? new Date(item.created_at).toLocaleString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }) : ' '}</Text>
                                    }
                                    <Text style={{ color: colors.text, fontSize: 14 }}>{item.details ? item.details : ' '}</Text>
                                    <Text style={{ fontSize: 10, color: colors.subtitle }}>{`${item?.comments_aggregate?.aggregate?.count ?? 0} comment${item?.comments_aggregate?.aggregate?.count === 1 ? '' : 's'}`}{item.category ? `, #${item.category}` : ``}</Text>
                                </View></>}
                        </TouchableOpacity>
                    }
                />
            </KeyboardAvoidingView>
        </View >
    );
}