import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, TextInput, Platform, Keyboard, KeyboardAvoidingView } from 'react-native';
import { Auth } from "@aws-amplify/auth";
import LogoSvg from "../svgs/logo"
import { InputAccessoryViewComponent } from '../components/InputAccessoryViewComponent';
import { useApolloClient } from "@apollo/client";
import { WebSocketLink } from "@apollo/client/link/ws";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnimatedLogo } from '../components/AnimatedLogo';
import { useTheme } from '@react-navigation/native';

export default function LoginScreen({ route, navigation, setLoading, loading }: any) {
    const client = useApolloClient();
    const [state, setState] = useState({ email: '', password: '', errorMessage: '', successMessage: '', success: false });
    const { colors } = useTheme();
    const styles = makeStyles(colors);

    useEffect(() => {
        if (!route.params) { route.params = {}; }
        if (route.params.success) { setState({ ...state, success: true, successMessage: 'Success! Confirm your email before logging in' }); }
        if (route.params.reset) { setState({ ...state, success: true, successMessage: 'We sent you a link to reset your password' }); }
        if (route.params.username && route.params.code) {
            Auth.confirmSignUp(route.params.username, route.params.code).then((response) => {
                setState({ ...state, success: true, successMessage: 'Email successfully confirmed! You may log in' });
            });
        }
        if (route.params.demo) {
            setLoading(true);
            Auth.signIn({
                username: 'demo@productabot.com',
                password: 'password'
            }).then(() => {
                //if the login attempt succeeds, store the password
                AsyncStorage.setItem('e2e', 'password').then(() => {
                    connectWebsocket();
                    setState({ ...state, errorMessage: '', success: false, email: '', password: '' });
                    setLoading(false);
                    navigation.navigate('app');
                });
            });
        }
    }, [route.params]);

    const login = async () => {
        Keyboard.dismiss();
        setLoading(true);
        try {
            await Auth.signIn({
                username: state.email,
                password: state.password
            });
            await AsyncStorage.setItem('e2e', state.password);
            connectWebsocket();
            setLoading(false);
            setState({ ...state, errorMessage: '', success: false, email: '', password: '' });
            navigation.navigate('app');
        }
        catch (err) {
            console.log(err);
            setLoading(false);
            setState({ ...state, success: false, errorMessage: err.code === 'UserNotConfirmedException' ? 'Confirm your email address before logging in' : 'Your username or password is incorrect' });
        }
    }

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

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={[styles.container, { width: '100%', height: '100%' }]}
                keyboardVerticalOffset={-200}
            >
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <AnimatedLogo loading={loading} size={1.5} />
                    <Text style={[styles.baseText, { fontSize: s(50, 0.85), marginLeft: 5 }]}>productabot</Text>
                </TouchableOpacity>
                <View style={{ margin: 30 }}>
                    {state.errorMessage.length > 0 && <Text style={[styles.baseText, { color: '#cc0000', textAlign: 'center', marginTop: -16 }]}>{state.errorMessage}</Text>}
                    {state.success && <Text style={[styles.baseText, { color: '#006600', textAlign: 'center', marginTop: -16 }]}>{state.successMessage}</Text>}
                    <TextInput spellCheck={false} inputAccessoryViewID='main' value={state.email} onChangeText={value => { setState({ ...state, email: value }) }} placeholder='email' style={[styles.textInput, isWeb && { outlineWidth: 0 }]} keyboardType='email-address'></TextInput>
                    <TextInput spellCheck={false} inputAccessoryViewID='main' value={state.password} onChangeText={value => { setState({ ...state, password: value }) }} placeholder='password' secureTextEntry={true} style={[styles.textInput, isWeb && { outlineWidth: 0 }]} returnKeyType='send'
                        onSubmitEditing={login}></TextInput>
                </View>
                <TouchableOpacity style={[styles.touchableOpacity, { backgroundColor: '#3F0054' }]}
                    onPress={login}
                >
                    <Text style={[styles.baseText, styles.buttonText]}>login</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.touchableOpacity, { backgroundColor: '#3F91A1' }]}
                    onPress={() => { navigation.navigate('signup') }}>
                    <Text style={[styles.baseText, styles.buttonText]}>signup</Text>
                </TouchableOpacity>
                <View>
                    <Text style={{ color: colors.text, textDecorationLine: 'underline', marginTop: 10 }} onPress={() => { navigation.navigate('reset') }}>forgot password?</Text>
                    <Text style={[styles.baseText, { fontSize: 10, color: '#aaaaaa', marginTop: 30, textAlign: 'center' }]}>© {new Date().getFullYear()} productabot</Text>
                </View>
            </KeyboardAvoidingView>
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
        margin: s(10)
    },
    buttonText: {
        fontSize: isWeb ? s(30) : 22,
        color: '#ffffff'
    },
    textInput: {
        fontSize: isWeb ? s(30) : 22,
        width: 275,
        borderBottomColor: colors.text,
        borderBottomWidth: 1,
        color: colors.text,
        margin: s(10)
    },
});
