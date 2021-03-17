import { StackScreenProps } from '@react-navigation/stack';
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Image, TextInput, Platform, Keyboard } from 'react-native';
import { Auth } from "aws-amplify";
import LogoSvg from "../svgs/logo";
import { LoadingComponent } from '../components/LoadingComponent';
import { InputAccessoryViewComponent } from '../components/InputAccessoryViewComponent';
import * as root from '../Root';

export default function SignupScreen({ route, navigation }: any) {
    const [state, setState] = useState({
        email: '', username: '', password: '', confirmPassword: '', errorMessage: '', checkbox: false, loading: false
    });
    const signup = async () => {
        Keyboard.dismiss();
        if (!state.email || !state.username || !state.password || !state.confirmPassword) {
            setState({ ...state, errorMessage: "You're missing some information" });
        }
        else if (state.password !== state.confirmPassword) {
            setState({ ...state, errorMessage: "Make sure your passwords match!" });
        }
        else if (!state.checkbox) {
            setState({ ...state, errorMessage: "You must agree to the\nTerms of Service & Privacy Policy" });
        }
        else {
            setState({ ...state, loading: true });
            try {
                let response = await Auth.signUp({ username: state.email, password: state.password, attributes: { 'custom:username': state.username, 'custom:userType': 'user' } });
                //console.log(response);
                setState({ ...state, loading: false, errorMessage: '', email: '', username: '', password: '', confirmPassword: '' });
                navigation.navigate('login', { success: true });
            }
            catch (err) {
                console.log(err);
                if (err.message === "1 validation error detected: Value at 'password' failed to satisfy constraint: Member must have length greater than or equal to 6") {
                    setState({ ...state, loading: false, errorMessage: "Your password must be at least 6 characters" });
                }
                else if (err.message === "Username should be an email.") {
                    setState({ ...state, loading: false, errorMessage: "Please enter a valid email address" });
                }
                else if (err.message === "An account with the given email already exists.") {
                    setState({ ...state, loading: false, errorMessage: "An account with this email already exists" });
                }
            }
        }
    }

    return (
        <View style={styles.container}>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <LogoSvg width={s(50, 0.85)} height={s(50, 0.85)} style={{ marginRight: 10 }} />
                <Text style={[styles.baseText, { fontSize: s(50, 0.85) }]}>productabot</Text>
            </TouchableOpacity>
            <View style={{ margin: 30 }}>
                {state.errorMessage.length > 0 && <Text style={[styles.baseText, { color: '#cc0000', textAlign: 'center', marginTop: -16 }]}>{state.errorMessage}</Text>}
                <TextInput spellCheck={false} inputAccessoryViewID='main' onChangeText={value => { setState({ ...state, email: value }); }} placeholder='email' style={[styles.textInput, isWeb && { outlineWidth: 0 }]} keyboardType='email-address' />
                <TextInput spellCheck={false} inputAccessoryViewID='main' onChangeText={value => { setState({ ...state, username: value }); }} placeholder='username' style={[styles.textInput, isWeb && { outlineWidth: 0 }]} />
                <TextInput spellCheck={false} inputAccessoryViewID='main' onChangeText={value => { setState({ ...state, password: value }); }} placeholder='password' secureTextEntry={true} style={[styles.textInput, isWeb && { outlineWidth: 0 }]} returnKeyType='send' />
                <TextInput spellCheck={false} inputAccessoryViewID='main' onChangeText={value => { setState({ ...state, confirmPassword: value }); }} placeholder='confirm password' secureTextEntry={true} style={[styles.textInput, isWeb && { outlineWidth: 0 }]} returnKeyType='send'
                    onSubmitEditing={signup} />
                <View style={{ flexDirection: 'row', alignItems: 'center', margin: 10 }}>
                    <TouchableOpacity onPress={() => { setState({ ...state, checkbox: !state.checkbox }) }} style={{ borderWidth: 1, borderColor: '#ffffff', borderRadius: 2, height: 20, width: 20, marginRight: 10 }}><Text style={{ color: '#ffffff', textAlign: 'center' }}>{state.checkbox && '✔'}</Text></TouchableOpacity>
                    <Text style={{ color: '#ffffff', fontSize: root.desktopWeb ? 11 : 12 }}>I agree to the <Text style={{ textDecorationLine: 'underline' }} onPress={() => { navigation.navigate('terms'); }} >Terms of Service</Text> & <Text style={{ textDecorationLine: 'underline' }} onPress={() => { navigation.navigate('privacy'); }}>Privacy Policy</Text></Text>
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
            {state.loading && <LoadingComponent />}
            <InputAccessoryViewComponent />
        </View>
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
        fontSize: s(30)
    },
    textInput: {
        fontSize: s(30),
        width: 275,
        borderBottomColor: '#ffffff',
        borderBottomWidth: 1,
        color: '#ffffff',
        margin: s(10)
    },
});
