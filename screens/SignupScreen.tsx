import { StackScreenProps } from '@react-navigation/stack';
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Image, TextInput, Platform, Keyboard, KeyboardAvoidingView, SafeAreaView } from 'react-native';
import { Auth } from "aws-amplify";
import LogoSvg from "../svgs/logo";
import { LoadingComponent } from '../components/LoadingComponent';
import { InputAccessoryViewComponent } from '../components/InputAccessoryViewComponent';
import * as root from '../Root';
import * as WebBrowser from 'expo-web-browser';
import { useApolloClient } from "@apollo/client";
import { WebSocketLink } from "@apollo/client/link/ws";
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SignupScreen({ route, navigation }: any) {
    const client = useApolloClient();
    const defaultState = { email: '', username: '', password: '', confirmPassword: '', errorMessage: '', successMessage: '', checkbox: false, loading: false };
    const [state, setState] = useState(defaultState);
    const connectWebsocket = () => {
        client.setLink(new WebSocketLink({
            uri: "wss://api.pbot.it/v1/graphql",
            options: {
                reconnect: true,
                connectionParams: async () => ({
                    headers: {
                        Authorization: "Bearer " + (await Auth.currentSession()).idToken.jwtToken
                    }
                })
            }
        }));
    }
    const signup = async () => {
        Keyboard.dismiss();
        setState({ ...state, loading: true });
        if (!state.email || !state.username || !state.password || !state.confirmPassword) {
            setState({ ...state, loading: false, errorMessage: "You're missing some information" });
        }
        else if (!state.checkbox) {
            setState({ ...state, loading: false, errorMessage: "You must agree to the Terms and Privacy Policy" });
        }
        else if (state.password !== state.confirmPassword) {
            setState({ ...state, loading: false, errorMessage: "Make sure your passwords match!" });
        }
        else if (state.password.length < 6) {
            setState({ ...state, loading: false, errorMessage: "Your password must be at least 6 characters long" });
        }
        else {
            try {
                await Auth.signUp({ username: uuidv4(), password: state.password, attributes: { 'custom:username': state.username, email: state.email, 'custom:userType': 'user' } });
                await Auth.signIn({ username: state.username, password: state.password });
                await AsyncStorage.setItem('e2e', state.password);
                connectWebsocket();
                setState(defaultState);
                navigation.navigate('app');
            }
            catch (err) {
                console.log(err);
                if (err.message === "Invalid email address format.") {
                    setState({ ...state, loading: false, errorMessage: "Please enter a valid email address" });
                }
                else if (err.message === "An account with the given email already exists.") {
                    setState({ ...state, loading: false, errorMessage: "An account with this email already exists" });
                }
                else {
                    setState({ ...state, loading: false, errorMessage: "An account with this username already exists" });
                }
            }
        }
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={[styles.container, { width: '100%', height: '100%' }]}
            >
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <LogoSvg width={s(50, 0.85)} height={s(50, 0.85)} style={{ marginRight: 10 }} />
                    <Text style={[styles.baseText, { fontSize: s(50, 0.85) }]}>productabot</Text>
                </TouchableOpacity>
                <View style={{ margin: 30, marginBottom: 0, maxWidth: 280 }}>
                    <Text style={[styles.baseText]}>{`NOTE: This app uses end-to-end encryption.\n\nYour password will be the key used to encrypt your documents and notes.\n\n`}<Text style={{ fontWeight: 'bold', color: '#ff3333' }}>{`▲ DO NOT FORGET IT!`}</Text>{`\nWrite it down and keep it somewhere safe.`}</Text>
                </View>
                <View style={{ margin: 30 }}>
                    {state.errorMessage.length > 0 && <Text style={[styles.baseText, { color: '#cc0000', textAlign: 'center', marginTop: -16 }]}>{state.errorMessage}</Text>}
                    <TextInput spellCheck={false} inputAccessoryViewID='main' onChangeText={value => { setState({ ...state, email: value }); }} placeholder='email' style={[styles.textInput, isWeb && { outlineWidth: 0 }]} keyboardType='email-address' />
                    <TextInput spellCheck={false} inputAccessoryViewID='main' onChangeText={value => { setState({ ...state, username: value }); }} placeholder='username' style={[styles.textInput, isWeb && { outlineWidth: 0 }]} />
                    <TextInput spellCheck={false} inputAccessoryViewID='main' onChangeText={value => { setState({ ...state, password: value }); }} placeholder='password' secureTextEntry={true} style={[styles.textInput, isWeb && { outlineWidth: 0 }]} returnKeyType='send' />
                    <TextInput spellCheck={false} inputAccessoryViewID='main' onChangeText={value => { setState({ ...state, confirmPassword: value }); }} placeholder='confirm password' secureTextEntry={true} style={[styles.textInput, isWeb && { outlineWidth: 0 }]} returnKeyType='send'
                        onSubmitEditing={signup} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', margin: 10 }}>
                        <TouchableOpacity onPress={() => { setState({ ...state, checkbox: !state.checkbox }) }} style={{ borderWidth: 1, borderColor: '#ffffff', borderRadius: 2, height: 20, width: 20, marginRight: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#ffffff', textAlign: 'center', fontWeight: 'bold' }}>{state.checkbox && '✓'}</Text></TouchableOpacity>
                        <Text style={{ color: '#ffffff', fontSize: root.desktopWeb ? 11 : 12 }}>I agree to the <Text style={{ textDecorationLine: 'underline' }} onPress={async () => { await WebBrowser.openBrowserAsync('https://productabot.com/terms'); }} >Terms of Service</Text> & <Text style={{ textDecorationLine: 'underline' }} onPress={async () => { await WebBrowser.openBrowserAsync('https://productabot.com/privacy'); }}>Privacy Policy</Text></Text>
                    </View>
                </View>
                <TouchableOpacity style={[styles.touchableOpacity, { backgroundColor: '#3F91A1' }]} onPress={signup}>
                    <Text style={[styles.baseText, styles.buttonText]}>register</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.touchableOpacity, { backgroundColor: '#000000' }]}
                    onPress={() => { navigation.navigate('login') }}>
                    <Text style={[styles.baseText, styles.buttonText]}>go back</Text>
                </TouchableOpacity>
                <InputAccessoryViewComponent />
            </KeyboardAvoidingView>
            {state.loading && <LoadingComponent />}
        </SafeAreaView>
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
        fontSize: isWeb ? s(30) : 22
    },
    textInput: {
        fontSize: isWeb ? s(30) : 22,
        width: 275,
        borderBottomColor: '#ffffff',
        borderBottomWidth: 1,
        color: '#ffffff',
        margin: s(10)
    },
});
