import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Image, TextInput, Platform, Keyboard, KeyboardAvoidingView } from 'react-native';
import { Auth } from "@aws-amplify/auth";
import LogoSvg from "../svgs/logo";
import { InputAccessoryViewComponent } from '../components/InputAccessoryViewComponent';
import * as root from '../Root';
import * as WebBrowser from 'expo-web-browser';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@react-navigation/native';
import { AnimatedLogo } from '../components/AnimatedLogo';

export default function SignupScreen({ route, navigation, setLoading, loading }: any) {
    const defaultState = { email: '', username: '', password: '', confirmPassword: '', errorMessage: '', successMessage: '', checkbox: false };
    const [state, setState] = useState(defaultState);
    const { colors } = useTheme();
    const styles = makeStyles(colors);
    const signup = async () => {
        Keyboard.dismiss();
        setState({ ...state, loading: true });
        if (!state.email || !state.username || !state.password || !state.confirmPassword) {
            setState({ ...state, errorMessage: "You're missing some information" });
        }
        else if (!state.checkbox) {
            setState({ ...state, errorMessage: "You must agree to the Terms and Privacy Policy" });
        }
        else if (state.password !== state.confirmPassword) {
            setState({ ...state, errorMessage: "Make sure your passwords match!" });
        }
        else if (state.password.length < 6) {
            setState({ ...state, errorMessage: "Your password must be at least 6 characters long" });
        }
        else {
            setLoading(true);
            try {
                await Auth.signUp({ username: uuidv4(), password: state.password, attributes: { 'custom:username': state.username, email: state.email, 'custom:userType': 'user' } });
                setLoading(false);
                navigation.navigate('login', { success: true });
            }
            catch (err) {
                console.log(err);
                setLoading(false);
                if (err.message === "Invalid email address format.") {
                    setState({ ...state, errorMessage: "Please enter a valid email address" });
                }
                else if (err.message === "An account with the given email already exists.") {
                    setState({ ...state, errorMessage: "An account with this email already exists" });
                }
                else {
                    setState({ ...state, errorMessage: "An account with this email or username already exists" });
                }
            }
        }
    }

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={[styles.container, { width: '100%', height: '100%' }]}
            >
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <AnimatedLogo loading={loading} size={1.5} />
                    <Text style={[styles.baseText, { fontSize: s(50, 0.85) }]}>productabot</Text>
                </TouchableOpacity>
                {state.errorMessage.length > 0 && <Text style={[styles.baseText, { marginTop: 5, marginBottom: -21, color: '#cc0000', textAlign: 'center' }]}>{state.errorMessage}</Text>}
                <View style={{ margin: 20 }}>
                    <TextInput placeholderTextColor={colors.placeholder} spellCheck={false} inputAccessoryViewID='main' onChangeText={value => { setState({ ...state, email: value }); }} placeholder='Email' style={[styles.textInput, isWeb && { outlineWidth: 0 }]} keyboardType='email-address' />
                    {/* <TextInput placeholderTextColor={colors.placeholder} spellCheck={false} inputAccessoryViewID='main' onChangeText={value => { setState({ ...state, phone: value }); }} placeholder='phone' style={[styles.textInput, isWeb && { outlineWidth: 0 }]} keyboardType='phone-pad' /> */}
                    <TextInput placeholderTextColor={colors.placeholder} spellCheck={false} inputAccessoryViewID='main' onChangeText={value => { setState({ ...state, username: value }); }} placeholder='Username' style={[styles.textInput, isWeb && { outlineWidth: 0 }]} />
                    <TextInput placeholderTextColor={colors.placeholder} spellCheck={false} inputAccessoryViewID='main' onChangeText={value => { setState({ ...state, password: value }); }} placeholder='Password' secureTextEntry={true} style={[styles.textInput, isWeb && { outlineWidth: 0 }]} returnKeyType='send' />
                    <TextInput placeholderTextColor={colors.placeholder} spellCheck={false} inputAccessoryViewID='main' onChangeText={value => { setState({ ...state, confirmPassword: value }); }} placeholder='Confirm password' secureTextEntry={true} style={[styles.textInput, isWeb && { outlineWidth: 0 }]} returnKeyType='send'
                        onSubmitEditing={signup} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', margin: 5, marginTop: 20 }}>
                        {Platform.OS === 'web' ?
                            <input onClick={() => { setState({ ...state, checkbox: !state.checkbox }) }} checked={state.checkbox} style={{ width: 20, height: 20, margin: 0 }} type="checkbox" /> :
                            <TouchableOpacity onPress={() => { setState({ ...state, checkbox: !state.checkbox }) }} style={{ borderWidth: 1, borderColor: colors.text, borderRadius: 2, height: 20, width: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginLeft: 5 }}><Text style={{ color: colors.text, textAlign: 'center', fontWeight: 'bold' }}>{state.checkbox && '✓'}</Text></TouchableOpacity>}
                        <Text style={{ marginLeft: 10, color: colors.text, fontSize: 12 }}>I agree to the <Text style={{ textDecorationLine: 'underline' }} onPress={async () => { await WebBrowser.openBrowserAsync('https://productabot.com/terms'); }} >Terms of Service</Text> & <Text style={{ textDecorationLine: 'underline' }} onPress={async () => { await WebBrowser.openBrowserAsync('https://productabot.com/privacy'); }}>Privacy Policy</Text></Text>
                    </View>
                </View>
                <TouchableOpacity style={[styles.touchableOpacity, { backgroundColor: '#3F91A1' }]} onPress={signup}>
                    <Text style={[styles.baseText, styles.buttonText]}>Sign up</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.touchableOpacity, { backgroundColor: 'transparent' }]}
                    onPress={() => { navigation.navigate('login'); }}>
                    <Text style={[styles.baseText, styles.buttonText, { color: colors.text }]}>Go back</Text>
                </TouchableOpacity>
                <InputAccessoryViewComponent />
            </KeyboardAvoidingView >
        </View >
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
        margin: s(10),
        borderRadius: 10
    },
    buttonText: {
        fontSize: isWeb ? s(30) : 22,
        color: '#ffffff'
    },
    textInput: {
        fontSize: isWeb ? s(30) : 22,
        width: 275,
        borderBottomColor: colors.border,
        borderBottomWidth: 1,
        color: colors.text,
        margin: s(10)
    },
});
