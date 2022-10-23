import React, { useState } from 'react';
import { Text, View } from '../components/Themed';
import { Storage } from "@aws-amplify/storage";
import { Auth } from "@aws-amplify/auth";
import { API, graphqlOperation } from "@aws-amplify/api";
import { TouchableOpacity, useWindowDimensions, Image, TextInput, StyleSheet, Alert, ScrollView, RefreshControl, Platform, KeyboardAvoidingView, FlatList, Linking } from 'react-native';
import * as root from '../Root';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { InputAccessoryViewComponent } from '../components/InputAccessoryViewComponent';
import * as WebBrowser from 'expo-web-browser';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@react-navigation/native';
import Purchases from 'react-native-purchases';

function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0 || !bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export default function SettingsScreen({ route, navigation, refresh, setLoading, setTheme, theme }: any) {
    const windowDimensions = useWindowDimensions();
    const [refreshControl, setRefreshControl] = useState(false);
    const [oldUser, setOldUser] = useState({});
    const [user, setUser] = useState({ ...route?.params?.state });
    const [size, setSize] = useState(0);
    const [index, setIndex] = useState(0);
    const [github, setGithub] = useState([]);
    const { colors } = useTheme();
    const styles = makeStyles(colors);

    useFocusEffect(
        React.useCallback(() => {
            onRefresh();
        }, [refresh])
    );

    const onRefresh = async (showRefreshControl = false) => {
        showRefreshControl ? setRefreshControl(true) : setLoading(true);
        let user = await Auth.currentSession();
        let data = await API.graphql(graphqlOperation(`{
            users{id created_at email username image first_name last_name plan phone github payment_method}
            files_aggregate(where: {project: {user_id: {_eq: "${user.getIdToken().payload.sub}"}}}) {
                aggregate {
                  sum {
                    size
                  }
                }
              }
        }`));
        console.log(data);
        setOldUser(data.data.users[0]);
        setUser(data.data.users[0]);
        setSize(data.data.files_aggregate.aggregate.sum.size);
        showRefreshControl ? setRefreshControl(false) : setLoading(false);
    }

    React.useEffect(() => {
        const async = async () => {
            if (index === 2 && user.github && github.length === 0) {
                try {
                    setLoading(true);
                    let data = await API.get('1', '/auth/github', {});
                    console.log(data);
                    setGithub(data);
                    setLoading(false);
                }
                catch (err) {
                    setLoading(false);
                    console.log(err);
                }
            }
        }
        async();
    }, [index])


    const pickImage = async () => {
        try {
            let selectedMedia = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 1,
                videoExportPreset: ImagePicker.VideoExportPreset.MediumQuality
            });
            if (!selectedMedia.cancelled) {
                setLoading(true);
                let media = await ImageManipulator.manipulateAsync(selectedMedia.uri, [{ resize: { width: 500 } }], { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG });
                let response = await fetch(media.uri);
                let blob = await response.blob();
                let filename = `${uuidv4()}.jpg`;
                await Storage.put(filename, blob, { contentType: 'image/jpeg', level: 'public' });
                try { user.image && await Storage.remove(user.image); }
                catch (err) { console.log(err); }
                setUser({ ...user, image: filename });
                await API.graphql(graphqlOperation(`
                mutation {
                    update_users_by_pk(pk_columns: {id: "${user.id}"}, _set: {image: "${filename}"}) {
                        id
                    }
                }`));
            }
            setLoading(false);
        } catch (err) {
            setLoading(false);
            console.log(err);
        }
    };

    const logout = async () => {
        setLoading(true);
        await Auth.signOut();
        setLoading(false);
        navigation.navigate('auth');
        Platform.OS === 'web' && setTimeout(() => { window.location.reload() }, 250);
    }

    const cancelChanges = async () => {
        setUser(oldUser);
    }

    const cancelPlanChanges = async () => {
        setUser({ ...user, plan: oldUser.plan });
    }

    const saveChanges = async () => {
        setLoading(true);
        try {
            await API.graphql(graphqlOperation(`
            mutation {
                update_users_by_pk(pk_columns: {id: "${user.id}"}, _set: {username: "${user.username}", email: "${user.email}", first_name: "${user.first_name}", last_name: "${user.last_name}", phone: "${user.phone}"}) {
                    id
                }
            }`));
            setLoading(false);
            onRefresh();
        }
        catch (err) {
            Alert.alert('There was an error saving your changes, please try again.');
            setLoading(false);
            onRefresh();
            console.log(err);
        }
        setLoading(false);

    }

    const upgrade = async () => {
        setLoading(true);
        if (Platform.OS === 'web') {
            window.open('https://buy.stripe.com/test_14k7u81Me1c6ev6cMO');
        }
        else if (Platform.OS === 'ios') {
            try {
                await Purchases.purchaseProduct("44750f17");
                //delay a second to process the added subscription
                await new Promise(resolve => setTimeout(resolve, 1000));
                await onRefresh();
            }
            catch (err) {
                // alert(JSON.stringify(err));
                if (err?.code === '1') {
                    Alert.alert(`Warning`, `You didn't complete your purchase! You're still on the free plan.`);
                    setUser({ ...user, plan: 'free' });
                }
                setLoading(false);
            }
        }
        setLoading(false);
    }
    const downgrade = async () => {
        if (oldUser.payment_method === 'stripe') {
            if (Platform.OS === 'web') {
                if (confirm(`Are you sure you want to move back to the free plan? You will lose access to everything except your first 2 projects, and if you have more than 50 mb of storage used, your latest data beyond 50mb will be deleted in 30 days.`)) {
                    await API.get('1', '/auth/cancelStripe', {});
                    alert(`Success! You're back on the free plan.`);
                }
            }
            else if (Platform.OS === 'ios') {
                alert(`Sorry, this plan is managed through a web-based subscription. Please login through a browser to cancel your subscription, or cancel by contacing support@productabot.com if you're unable to login through your browser.`);
            }
        }
        else if (oldUser.payment_method === 'ios') {
            if (Platform.OS === 'web') {
                alert(`Sorry, this plan is managed through an iOS subscription. Please use the app to cancel your subscription, or cancel by contacing support@productabot.com if you're unable to reach your device.`);
            }
            else if (Platform.OS === 'ios') {
                Alert.alert('Warning', 'Are you sure you want to move back to the free plan? You will lose access to everything except your first 2 projects, and if you have more than 50 mb of storage used, your latest data beyond 50mb will be deleted in 30 days.\n\nIf click you click "Yes", you will be redirected to the App Store Manage Subscriptions page where you can cancel your subscription.',
                    [{ text: "No", style: "cancel" }, {
                        text: "Yes", style: "destructive", onPress: async () => {
                            const purchaserInfo = await Purchases.getPurchaserInfo();
                            Linking.openURL(purchaserInfo?.managementURL);
                        }
                    }]);
            }
        }
        else {
            alert(`There was an error processing your request, please contact support@productabot.com for more assistance.`);
        }
        setLoading(false);
    }

    return (
        <ScrollView
            style={{ width: '100%', height: '100%', overflow: 'visible' }}
            contentContainerStyle={{ display: 'flex', alignItems: 'center', paddingTop: Platform.OS === 'web' ? 50 : 0 }}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ height: '100%', width: Math.min(windowDimensions.width, 800), padding: 10 }}
            >
                <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', width: '100%' }}>
                    <TouchableOpacity onPress={() => { pickImage(); }}>
                        <Image
                            style={{ width: 80, height: 80, marginRight: 10, borderColor: colors.text, borderWidth: 1, borderRadius: '100%' }}
                            source={{ uri: `https://files.productabot.com/public/${user.image}` }}
                        />
                    </TouchableOpacity>
                    <View style={{ flexDirection: 'column' }}>
                        <Text style={{ fontSize: 30 }}>{user.username}</Text>
                        <Text style={{ fontSize: 15 }}>{user.created_at ? `productive since ${new Date(user.created_at).toLocaleDateString()}` : ``}</Text>
                        <Text style={{ fontSize: 15 }}>{`${formatBytes(size)} out of ${user.plan === 'free' ? `50 MB` : `500 GB`} used`}</Text>
                    </View>
                    <View style={{ alignSelf: 'flex-start', marginLeft: 'auto', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', height: 80 }}>
                        <Text style={{ fontSize: 8, margin: 10, textAlign: 'center', color: colors.text + '66' }}>{`v1.0.0.2`}</Text>
                        <TouchableOpacity style={{ borderColor: colors.text, borderRadius: 5, borderWidth: 1, borderStyle: 'solid', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 25, marginRight: 10, paddingTop: 0, paddingBottom: 0, width: Platform.OS === 'web' ? '100%' : 60, marginBottom: 5 }} onPress={logout}>
                            <Text style={{ color: colors.text, fontSize: 14 }}>log out →</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{ borderColor: colors.text, borderRadius: 5, borderWidth: 1, borderStyle: 'solid', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 25, marginRight: 10, paddingTop: 0, paddingBottom: 0, width: Platform.OS === 'web' ? '100%' : 60 }} onPress={async () => {
                            let currentTheme = await AsyncStorage.getItem('theme');
                            let nextTheme = 'dark';
                            if (!currentTheme || currentTheme === 'dark') {
                                nextTheme = 'light';
                            }
                            await AsyncStorage.setItem('theme', nextTheme);
                            setTheme(nextTheme);
                        }} >
                            <Text style={{ color: colors.text, fontSize: 14 }}>{theme === 'dark' ? (Platform.OS === 'web' ? 'turn on the lights ☀' : '☀ light') : (Platform.OS === 'web' ? 'turn off the lights ◗*' : '◗* dark')}</Text>
                        </TouchableOpacity>
                    </View>

                </View>
                <View style={{ flexDirection: 'column', width: '100%' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 10 }}>
                        {[{
                            key: 'free', image: require('../assets/images/free.png'), label: 'free', price: '$0.00 per month', points: [
                                '50 MB storage', '2 projects', 'no website', 'no integrations'
                            ]
                        },
                        {
                            key: 'paid', image: require('../assets/images/premium.png'), label: '✦ premium', price: '$4.99 per month', points: [
                                '500 GB storage', 'unlimited projects', 'custom website', 'API integrations'
                            ]
                        }].map(obj =>
                            <View key={obj.key} style={{ flexDirection: Platform.OS === 'web' ? 'row' : 'column', alignItems: 'center', justifyContent: Platform.OS === 'web' ? 'center' : 'flex-start', width: '48%', height: Platform.OS === 'web' ? 300 : 400, borderRadius: 10, borderColor: colors.border, borderWidth: 1, margin: 5, backgroundColor: user.plan === obj.key ? '#3F0054' : colors.background }}>
                                <View>
                                    {user.plan === obj.key && <Text style={{ position: 'absolute', fontWeight: 'bold', color: user.plan === obj.key ? '#ffffff' : colors.text, textAlign: 'center', fontSize: 18, top: Platform.OS === 'web' ? -20 : 20, left: 10 }}>30 day free trial!</Text>}
                                    <Image style={{ height: 150, width: 150, marginRight: Platform.OS === 'web' ? 30 : 0, marginTop: Platform.OS === 'web' ? 0 : 30, tintColor: user.plan === obj.key ? '#ffffff' : colors.text }} source={obj.image} />
                                </View>
                                <View style={{ flexDirection: 'column', padding: 10 }}>
                                    <View style={{ flexDirection: 'column', alignItems: 'flex-start', marginBottom: 10 }}>
                                        <Text style={{ color: user.plan === obj.key ? '#ffffff' : colors.text, fontSize: 20, fontWeight: 'bold' }}>{obj.label}</Text>
                                        <Text style={{ color: user.plan === obj.key ? '#ffffff' : colors.text, fontSize: 20 }}>{obj.price}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'column', padding: 5 }}>
                                        {obj.points.map(innerObj =>
                                            <Text key={innerObj} style={{ color: user.plan === obj.key ? '#ffffff' : colors.text, fontSize: 14, marginBottom: 5 }}>• {innerObj}</Text>
                                        )}
                                    </View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 }}>
                                        {user.plan ?
                                            (user.plan !== obj.key ?
                                                <TouchableOpacity onPress={obj.key === 'free' ? downgrade : upgrade} style={{ borderRadius: 10, padding: 10, width: '85%', backgroundColor: '#3F0054' }}><Text style={{ color: '#ffffff', textAlign: 'center' }}>{obj.key === 'free' ? `downgrade` : `upgrade`}</Text></TouchableOpacity>
                                                :
                                                <TouchableOpacity style={{ borderRadius: 10, padding: 10, width: '100%', backgroundColor: '#000000' }}><Text style={{ color: '#ffffff', textAlign: 'center' }}>{`subscribed ✓`}</Text></TouchableOpacity>)
                                            :
                                            <TouchableOpacity style={{ borderRadius: 10, padding: 10, width: '100%', backgroundColor: '#000000' }}><Text style={{ color: '#ffffff', textAlign: 'center' }}>{` `}</Text></TouchableOpacity>}
                                    </View>
                                </View>
                            </View>)}
                    </View>
                    <View style={{ padding: 10 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', alignSelf: 'center', width: '100%' }}>
                            <Text style={{ fontSize: 20, marginRight: 5, width: '22%', textAlign: 'center' }}>website </Text>
                            <Text onPress={async () => {
                                root.desktopWeb ? window.open(`https://${user.username}.pbot.it`) :
                                    await WebBrowser.openBrowserAsync(`https://${user.username}.pbot.it`);
                            }} style={[styles.textInput, { borderWidth: 0, width: '78%', textDecorationLine: 'underline' }]}>
                                {user.username ? `${user.username}.pbot.it →` : ``}
                            </Text>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', alignSelf: 'center', width: '100%' }}>
                            <Text style={{ fontSize: 20, marginRight: 5, width: '22%', textAlign: 'center' }}>username</Text>
                            <TextInput placeholderTextColor={colors.placeholder} inputAccessoryViewID='main' value={user.username} onChangeText={(value) => { setUser({ ...user, username: value }) }} style={[styles.textInput, { width: '78%' }]} />
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', alignSelf: 'center', width: '100%' }}>
                            <Text style={{ fontSize: 20, marginRight: 5, width: '22%', textAlign: 'center' }}>email</Text>
                            <TextInput placeholderTextColor={colors.placeholder} inputAccessoryViewID='main' value={user.email} onChangeText={(value) => { setUser({ ...user, email: value }) }} style={[styles.textInput, { width: '78%' }]} />
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', alignSelf: 'center', width: '100%' }}>
                            <Text style={{ fontSize: 20, marginRight: 5, width: '22%', textAlign: 'center' }}>phone</Text>
                            <TextInput placeholderTextColor={colors.placeholder} keyboardType='phone-pad' inputAccessoryViewID='main' value={`${user.phone ? user.phone : ''}`} onChangeText={(value) => { setUser({ ...user, phone: value }) }} style={[styles.textInput, { width: '78%' }]} />
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', alignSelf: 'center', width: '100%' }}>
                            <Text style={{ fontSize: 20, marginRight: 5, width: '22%', textAlign: 'center' }}>full name</Text>
                            <TextInput placeholderTextColor={colors.placeholder} inputAccessoryViewID='main' value={user.first_name} onChangeText={(value) => { setUser({ ...user, first_name: value }) }} style={[styles.textInput, { width: '78%' }]} />
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', alignSelf: 'center', width: '100%' }}>
                            <Text style={{ fontSize: 20, marginRight: 5, width: '22%', textAlign: 'center' }}>password</Text>
                            <Text onPress={async () => { }} style={[styles.textInput, { borderWidth: 0, width: '78%', textDecorationLine: 'underline' }]}>
                                {`change password →`}
                            </Text>
                        </View>
                        {(user !== oldUser) &&
                            <View style={{ flexDirection: 'row', marginTop: 10, justifyContent: 'center', alignItems: 'center' }}>
                                <TouchableOpacity onPress={cancelChanges} style={{ marginRight: 20 }}><Text style={{ textAlign: 'center' }}>cancel</Text></TouchableOpacity>
                                <TouchableOpacity onPress={saveChanges} style={{ borderRadius: 10, padding: 10, width: 150, backgroundColor: '#3F0054', marginRight: -20 }}><Text style={{ color: '#ffffff', textAlign: 'center' }}>save changes</Text></TouchableOpacity>
                            </View>}
                    </View>
                </View>
            </KeyboardAvoidingView>
            <InputAccessoryViewComponent />
        </ScrollView>
    );
}

const makeStyles = (colors: any) => StyleSheet.create({
    textInput: { backgroundColor: colors.background, color: colors.text, borderWidth: 1, borderColor: '#666666', borderStyle: 'solid', padding: 5, marginTop: 5, marginBottom: 5, fontSize: 20, borderRadius: 10 }
});
