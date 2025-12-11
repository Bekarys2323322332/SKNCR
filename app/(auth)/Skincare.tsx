import { authRN, db } from "@/utils/firebaseConfig";
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { ReactNode, useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { savePlan } from "../../utils/storage";



interface SkincareAnswers {
  skinType: string;
  concerns: string[];
  sunExposure: string;
  allergies: string[];
  lifestyle: string[];
  goals: string[];
  routineLevel: string;
  budget: string;
  skinSensitivity: string;
  productPreferences: string[];
  climateType: string;
  makeupFrequency: string;
  waterIntake: string;
  sleepSchedule: string;
  stressLevel: string;
  previousProducts: string[];
  skinTexture: string[];
  timeCommitment: string;
  environmentalExposure: string[];
  dietType: string;
}

interface SkincareRoutine {
  morning: string[];
  evening: string[];
  spf: string;
  brands: string[];
  tips: string[];
}

interface Question {
  id: keyof SkincareAnswers;
  title: string;
  subtitle: string;
  icon: ReactNode;
  type: 'single' | 'multiple';
  options: string[];
}

const questions: Question[] = [
  {
    id: 'skinType',
    title: "What's your skin type?",
    subtitle: 'Choose the option that best describes your skin',
    icon: <Ionicons name="heart" size={26} color="red" />,
    type: 'single',
    options: ['Oily', 'Dry', 'Combination', 'Normal', 'Sensitive']
  },
  {
    id: 'skinSensitivity',
    title: 'How sensitive is your skin?',
    subtitle: 'This helps us recommend gentler products',
    icon: <Ionicons name="shield-checkmark" size={26} color="#8b5cf6" />,
    type: 'single',
    options: ['Very Sensitive', 'Somewhat Sensitive', 'Not Sensitive']
  },
  {
    id: 'concerns',
    title: 'What are your main skin concerns?',
    subtitle: 'Select all that apply',
    icon: <Ionicons name="star" size={26} color="#fbbf24" />,
    type: 'multiple',
    options: ['Acne', 'Redness', 'Dryness', 'Dark Spots', 'Aging', 'Dullness']
  },
  {
    id: 'skinTexture',
    title: "What's your skin texture like?",
    subtitle: 'Choose what best describes your skin',
    icon: <Ionicons name="finger-print" size={26} color="#a855f7" />,
    type: 'multiple',
    options: ['Smooth', 'Rough', 'Bumpy', 'Uneven', 'Large Pores']
  },
  {
    id: 'goals',
    title: 'What are your skincare goals?',
    subtitle: 'Select your top priorities',
    icon: <Ionicons name="trophy" size={26} color="#fbbf24" />,
    type: 'multiple',
    options: ['Brightening', 'Anti-aging', 'Acne control', 'Hydration', 'Even Texture']
  },
  {
    id: 'sunExposure',
    title: 'How much sun exposure do you get daily?',
    subtitle: 'This helps us recommend the right SPF',
    icon: <Ionicons name="sunny" size={26} color="#f59e0b" />,
    type: 'single',
    options: ['Low', 'Moderate', 'High']
  },
  {
    id: 'climateType',
    title: 'What climate do you live in?',
    subtitle: 'Environmental factors affect your skin needs',
    icon: <Ionicons name="thermometer" size={26} color="#f97316" />,
    type: 'single',
    options: ['Hot & Humid', 'Hot & Dry', 'Cold & Dry', 'Cold & Humid', 'Temperate']
  },
  {
    id: 'environmentalExposure',
    title: 'What environmental factors affect your skin?',
    subtitle: 'Select all that apply',
    icon: <Ionicons name="leaf" size={26} color="#22c55e" />,
    type: 'multiple',
    options: ['Air Pollution', 'Air Conditioning', 'Heating', 'Chlorine (swimming)', 'Wind']
  },
  {
    id: 'makeupFrequency',
    title: 'How often do you wear makeup?',
    subtitle: 'This affects cleansing recommendations',
    icon: <Ionicons name="color-palette" size={26} color="#ec4899" />,
    type: 'single',
    options: ['Daily', 'Sometimes (2-3x week)', 'Rarely', 'Never']
  },
  {
    id: 'allergies',
    title: 'Do you have any allergies or sensitivities?',
    subtitle: 'This helps us recommend the right products',
    icon: <Ionicons name="alert-circle" size={26} color="#f43f5e" />,
    type: 'multiple',
    options: ['Fragrance', 'Alcohol', 'Essential Oils', 'Parabens', 'Sulfates']
  },
  {
    id: 'previousProducts',
    title: 'Have you used these ingredients before?',
    subtitle: 'Select any you have experience with',
    icon: <Ionicons name="flask" size={26} color="#14b8a6" />,
    type: 'multiple',
    options: ['Retinol', 'Vitamin C', 'AHAs/BHAs', 'Niacinamide', 'Peptides', 'Hyaluronic Acid']
  },
  {
    id: 'productPreferences',
    title: 'What product formats do you prefer?',
    subtitle: 'Select all that you like using',
    icon: <Ionicons name="water" size={26} color="#06b6d4" />,
    type: 'multiple',
    options: ['Creams', 'Gels', 'Serums', 'Oils', 'Balms']
  },
  {
    id: 'routineLevel',
    title: "What's your current skincare experience?",
    subtitle: "We'll tailor the complexity of your routine",
    icon: <Ionicons name="person" size={26} color="#3b82f6" />,
    type: 'single',
    options: ['Beginner', 'Intermediate', 'Advanced']
  },
  {
    id: 'timeCommitment',
    title: 'How much time can you dedicate to skincare?',
    subtitle: 'Be realistic about your daily routine',
    icon: <Ionicons name="time" size={26} color="#f59e0b" />,
    type: 'single',
    options: ['5 minutes or less', '5-10 minutes', '10-15 minutes', '15+ minutes']
  },
  {
    id: 'lifestyle',
    title: 'How would you describe your lifestyle?',
    subtitle: 'This helps us recommend the right products',
    icon: <Ionicons name="walk" size={26} color="#3b82f6" />,
    type: 'single',
    options: ['Sedentary', 'Moderately Active', 'Very Active', 'Outdoor Activities']
  },
  {
    id: 'waterIntake',
    title: 'How much water do you drink daily?',
    subtitle: 'Hydration is key to healthy skin',
    icon: <Ionicons name="water-outline" size={26} color="#0ea5e9" />,
    type: 'single',
    options: ['Less than 4 glasses', '4-6 glasses', '6-8 glasses', 'More than 8 glasses']
  },
  {
    id: 'sleepSchedule',
    title: 'How many hours do you sleep per night?',
    subtitle: 'Sleep affects skin recovery and health',
    icon: <Ionicons name="bed" size={26} color="#6366f1" />,
    type: 'single',
    options: ['Less than 5 hours', '5-6 hours', '7-8 hours', 'More than 8 hours']
  },
  {
    id: 'stressLevel',
    title: 'How would you rate your stress level?',
    subtitle: 'Stress can impact your skin condition',
    icon: <Ionicons name="pulse" size={26} color="#ef4444" />,
    type: 'single',
    options: ['Low', 'Moderate', 'High', 'Very High']
  },
  {
    id: 'dietType',
    title: 'How would you describe your diet?',
    subtitle: 'Diet can influence skin health',
    icon: <Ionicons name="nutrition" size={26} color="#84cc16" />,
    type: 'single',
    options: ['Balanced', 'High Sugar', 'High Fat', 'Low Carb', 'Plant-based', 'High Protein']
  },
  {
    id: 'budget',
    title: "What's your preferred budget range?",
    subtitle: "We'll suggest products within your range",
    icon: <Ionicons name="wallet" size={26} color="#10b981" />,
    type: 'single',
    options: ['Affordable', 'Mid-range', 'Premium']
  }
];

const Skincare: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<SkincareAnswers>({
    skinType: '',
    concerns: [],
    sunExposure: '',
    allergies: [],
    lifestyle: [],
    goals: [],
    routineLevel: '',
    budget: '',
    skinSensitivity: '',
    productPreferences: [],
    climateType: '',
    makeupFrequency: '',
    waterIntake: '',
    sleepSchedule: '',
    stressLevel: '',
    previousProducts: [],
    skinTexture: [],
    timeCommitment: '',
    environmentalExposure: [],
    dietType: ''
  });
  const [showResults, setShowResults] = useState(false);

useEffect(() => {
  const run = async () => {
      const user = authRN.currentUser;

      if (!user) {
        router.replace("/(auth)/login");
        return;
      }

      await user.reload();
      const refreshed = authRN.currentUser;

      if (!refreshed) {
        router.replace("/(auth)/login");
        return;
      }

      if (!refreshed.emailVerified) {
        await authRN.signOut();
        router.replace("/(auth)/login");
        return;
      }
    };

    run();
  }, []);



  const currentQuestion = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;

  const handleAnswer = (questionId: keyof SkincareAnswers, value: string) => {
    setAnswers(prev => {
      if (currentQuestion.type === 'multiple') {
        const currentAnswers = (prev[questionId] as string[]) || [];
        const newAnswers = currentAnswers.includes(value)
          ? currentAnswers.filter(item => item !== value)
          : [...currentAnswers, value];
        return { ...prev, [questionId]: newAnswers };
      } else {
        return { ...prev, [questionId]: value };
      }
    });
  };

  const canProceed = () => {
    const answer = answers[currentQuestion.id];
    if (currentQuestion.type === 'multiple') {
      return Array.isArray(answer) && answer.length > 0;
    }
    return answer && String(answer).length > 0;
  };

  const nextStep = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowResults(true);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const generateRoutine = (): SkincareRoutine => {
    const routine: SkincareRoutine = {
      morning: [],
      evening: [],
      spf: '',
      brands: [],
      tips: []
    };

    // Base products by skin type
    const skinTypeProducts: Record<string, { morning: string[], evening: string[] }> = {
      "Oily": { 
        morning: ["Gel Cleanser", "Lightweight Moisturizer"], 
        evening: ["Gel Cleanser", "Oil-free Night Cream"] 
      },
      "Dry": { 
        morning: ["Cream Cleanser", "Rich Moisturizer"], 
        evening: ["Cream Cleanser", "Intensive Night Cream"] 
      },
      "Combination": { 
        morning: ["Gentle Foaming Cleanser", "Balanced Moisturizer"], 
        evening: ["Gentle Foaming Cleanser", "Balanced Night Cream"] 
      },
      "Normal": { 
        morning: ["Gentle Cleanser", "Lightweight Moisturizer"], 
        evening: ["Gentle Cleanser", "Night Moisturizer"] 
      },
      "Sensitive": { 
        morning: ["Fragrance-free Gentle Cleanser", "Soothing Moisturizer"], 
        evening: ["Fragrance-free Gentle Cleanser", "Calming Night Cream"] 
      }
    };

    if (answers.skinType && skinTypeProducts[answers.skinType]) {
      routine.morning.push(...skinTypeProducts[answers.skinType].morning);
      routine.evening.push(...skinTypeProducts[answers.skinType].evening);
    }

    // Add double cleansing for makeup wearers
    if (answers.makeupFrequency === 'Daily' || answers.makeupFrequency === 'Sometimes (2-3x week)') {
      routine.evening.unshift("Oil-based Cleanser or Micellar Water");
      routine.tips.push("Use double cleansing in the evening to remove makeup thoroughly");
    }

    // Treatment products based on concerns
    const concernProducts: Record<string, { am?: string[], pm?: string[] }> = {
      "Acne": { am: ["Niacinamide Serum"], pm: ["Salicylic Acid Treatment"] },
      "Redness": { am: ["Centella Serum"], pm: ["Azelaic Acid"] },
      "Dryness": { am: ["Hyaluronic Acid Serum"], pm: ["Ceramide Cream"] },
      "Dark Spots": { am: ["Vitamin C Serum"], pm: ["Niacinamide Serum"] },
      "Aging": { am: ["Peptide Serum"], pm: ["Retinol Serum"] },
      "Dullness": { am: ["Vitamin C Serum"], pm: ["AHA Exfoliant (2-3x week)"] }
    };

    answers.concerns.forEach(concern => {
      const products = concernProducts[concern];
      if (products) {
        if (products.am) routine.morning.push(...products.am);
        if (products.pm) routine.evening.push(...products.pm);
      }
    });

    // Add treatments based on goals
    answers.goals.forEach(goal => {
      if (goal === 'Brightening' && !routine.morning.includes('Vitamin C Serum')) {
        routine.morning.push('Vitamin C Serum');
      }
      if (goal === 'Hydration' && !routine.morning.includes('Hyaluronic Acid Serum')) {
        routine.morning.push('Hyaluronic Acid Serum');
      }
      if (goal === 'Even Texture' && !routine.evening.some(p => p.includes('AHA'))) {
        routine.evening.push('AHA Toner (2-3x week)');
      }
    });

    // SPF based on sun exposure
    const spfRecommendations: Record<string, string> = {
      "High": "SPF 50+ Broad Spectrum Sunscreen",
      "Moderate": "SPF 30-50 Broad Spectrum Sunscreen",
      "Low": "SPF 30 Broad Spectrum Sunscreen"
    };

    if (answers.sunExposure) {
      routine.spf = spfRecommendations[answers.sunExposure] || "SPF 30+ Sunscreen";
    }

    // Brand recommendations based on budget
    const budgetBrands: Record<string, string[]> = {
      "Affordable": ["The Ordinary", "CeraVe", "Simple", "Neutrogena", "La Roche-Posay Toleriane"],
      "Mid-range": ["La Roche-Posay", "Paula's Choice", "COSRX", "The INKEY List", "Cetaphil Pro"],
      "Premium": ["SkinCeuticals", "Drunk Elephant", "Shiseido", "Tatcha", "Dr. Barbara Sturm"]
    };

    if (answers.budget) {
      routine.brands = budgetBrands[answers.budget] || [];
    }

    // Add tips based on lifestyle factors
    if (answers.waterIntake === 'Less than 4 glasses') {
      routine.tips.push("Increase water intake to 6-8 glasses daily for better skin hydration");
    }

    if (answers.sleepSchedule === 'Less than 5 hours' || answers.sleepSchedule === '5-6 hours') {
      routine.tips.push("Aim for 7-8 hours of sleep to support skin repair and regeneration");
    }

    if (answers.stressLevel === 'High' || answers.stressLevel === 'Very High') {
      routine.tips.push("Consider stress-management techniques; stress can trigger skin issues");
    }

    if (answers.environmentalExposure.includes('Air Pollution')) {
      routine.tips.push("Use antioxidant serums to protect against pollution damage");
    }

    if (answers.climateType === 'Cold & Dry') {
      routine.tips.push("Use a humidifier and richer moisturizers during cold, dry weather");
    }

    if (answers.climateType === 'Hot & Humid') {
      routine.tips.push("Opt for lightweight, oil-free products in humid climates");
    }

    if (answers.timeCommitment === '5 minutes or less') {
      routine.tips.push("Focus on essentials: cleanse, treat, moisturize, and SPF");
    }

    // Remove duplicates
    routine.morning = [...new Set(routine.morning)];
    routine.evening = [...new Set(routine.evening)];

    return routine;
  };

  const handleComplete = async () => {
    const routine = generateRoutine();
    setShowResults(true);

    try {
      const user = authRN.currentUser;
    if (!user) {
      Alert.alert("Error", "You must be logged in");
      router.replace("/(auth)/login");
      return;
    }

    await savePlan({ answers, routine });

    await db.collection("users").doc(user.uid).set(
      {
        skincarePlanCompleted: true,
        skinType: answers.skinType,
        concerns: answers.concerns,
        sunExposure: answers.sunExposure,
        allergies: answers.allergies,
        lifestyle: answers.lifestyle,
        goals: answers.goals,
        routineLevel: answers.routineLevel,
        budget: answers.budget,
        skinSensitivity: answers.skinSensitivity,
        productPreferences: answers.productPreferences,
        climateType: answers.climateType,
        makeupFrequency: answers.makeupFrequency,
        waterIntake: answers.waterIntake,
        sleepSchedule: answers.sleepSchedule,
        stressLevel: answers.stressLevel,
        previousProducts: answers.previousProducts,
        skinTexture: answers.skinTexture,
        timeCommitment: answers.timeCommitment,
        environmentalExposure: answers.environmentalExposure,
        dietType: answers.dietType,
        lastUpdated: new Date().toISOString(),
      },
      { merge: true }
    );

      console.log("✅ Saved to Firestore!");

      router.replace("/(tabs)");
    } catch (err) {
      console.error("🔥 Firestore error:", err);
      Alert.alert("Error", "Failed to save your plan. Please try again.");
    }
  };

  const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => (
    <View className="h-2 bg-slate-200 rounded overflow-hidden mt-2">
      <View style={{ width: `${progress}%` }} className="h-full bg-indigo-400 rounded" />
    </View>
  );

  if (showResults) {
    const routine = generateRoutine();

    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="items-center mb-8 px-6 pt-6">
            <Ionicons name="checkmark-circle" size={100} color="#10b981" />
            <Text className="text-2xl font-bold text-center mt-4 mb-2 text-slate-800">
              Your Personalized Skincare Plan
            </Text>
            <Text className="text-base text-slate-500 text-center">
              Tailored just for you based on your answers
            </Text>
          </View>

          {/* Morning Routine */}
          <View className="mx-6 mb-6 bg-white rounded-2xl p-5 shadow border-l-4 border-yellow-400">
            <View className="flex-row items-center mb-4">
              <Ionicons name="sunny" size={22} color="#f59e0b" />
              <Text className="text-lg font-bold ml-2 text-slate-800">Morning Routine</Text>
            </View>
            <View className="space-y-3">
              {routine.morning.map((product, index) => (
                <View key={index} className="flex-row items-center bg-slate-50 rounded-lg p-3 mb-1">
                  <View className="w-8 h-8 rounded-full bg-yellow-100 justify-center items-center mr-3">
                    <Text className="font-bold text-slate-800">{index + 1}</Text>
                  </View>
                  <Text className="text-base text-slate-800 flex-1">{product}</Text>
                </View>
              ))}
              {routine.spf && (
                <View className="flex-row items-center border-2 border-yellow-300 rounded-lg p-3 mt-2">
                  <Ionicons name="sunny-outline" size={20} color="#f59e0b" style={{ marginRight: 8 }} />
                  <Text className="text-base font-semibold text-yellow-700">{routine.spf}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Evening Routine */}
          <View className="mx-6 mb-6 bg-white rounded-2xl p-5 shadow border-l-4 border-indigo-500">
            <View className="flex-row items-center mb-4">
              <Ionicons name="moon" size={22} color="#8b5cf6" />
              <Text className="text-lg font-bold ml-2 text-slate-800">Evening Routine</Text>
            </View>
            <View className="space-y-3">
              {routine.evening.map((product, index) => (
                <View key={index} className="flex-row items-center bg-slate-50 rounded-lg p-3 mb-1">
                  <View className="w-8 h-8 rounded-full bg-purple-100 justify-center items-center mr-3">
                    <Text className="font-bold text-slate-800">{index + 1}</Text>
                  </View>
                  <Text className="text-base text-slate-800 flex-1">{product}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Recommended Brands */}
          <View className="mx-6 mb-6 bg-white rounded-2xl p-5 shadow border-l-4 border-green-500">
            <View className="flex-row items-center mb-4">
              <Ionicons name="pricetag" size={22} color="#10b981" />
              <Text className="text-lg font-bold ml-2 text-slate-800">Recommended Brands</Text>
            </View>
            <View className="flex-row flex-wrap gap-3">
              {routine.brands.map((brand, index) => (
                <View key={index} className="py-2 px-4 bg-green-50 rounded-2xl border border-green-200 mb-2 mr-2">
                  <Text className="text-green-700 font-medium">{brand}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Tips Section */}
          {routine.tips.length > 0 && (
            <View className="mx-6 mb-6 bg-white rounded-2xl p-5 shadow border-l-4 border-blue-500">
              <View className="flex-row items-center mb-4">
                <Ionicons name="bulb" size={22} color="#3b82f6" />
                <Text className="text-lg font-bold ml-2 text-slate-800">Personalized Tips</Text>
              </View>
              {routine.tips.map((tip, index) => (
                <View key={index} className="flex-row items-start mb-3">
                  <View className="w-6 h-6 rounded-full bg-blue-100 justify-center items-center mr-3 mt-0.5">
                    <Ionicons name="checkmark" size={14} color="#3b82f6" />
                  </View>
                  <Text className="text-sm text-slate-700 flex-1">{tip}</Text>
                </View>
              ))}
            </View>
          )}

          <View className="flex-row justify-center gap-4 px-6 pb-8">
            <TouchableOpacity
              className="py-3 px-6 rounded-lg bg-white border border-slate-200 min-w-[120px] items-center"
              onPress={() => {
                setShowResults(false);
                setCurrentStep(0);
                setAnswers({
                  skinType: '',
                  concerns: [],
                  sunExposure: '',
                  allergies: [],
                  lifestyle: [],
                  goals: [],
                  routineLevel: '',
                  budget: '',
                  skinSensitivity: '',
                  productPreferences: [],
                  climateType: '',
                  makeupFrequency: '',
                  waterIntake: '',
                  sleepSchedule: '',
                  stressLevel: '',
                  previousProducts: [],
                  skinTexture: [],
                  timeCommitment: '',
                  environmentalExposure: [],
                  dietType: ''
                });
              }}
            >
              <Text className="text-base font-semibold text-slate-500">Start Over</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="py-3 px-6 rounded-lg bg-indigo-400 min-w-[120px] items-center"
              onPress={handleComplete}
            >
              <Text className="text-base font-semibold text-white">Continue to App</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.questionnaireContainer}>
        <View style={styles.progressSection}>
          <View style={styles.progressInfo}>
            <Text style={styles.stepText}>
              Step {currentStep + 1} of {questions.length}
            </Text>
            <Text style={styles.percentageText}>
              {Math.round(progress)}%
            </Text>
          </View>
          <ProgressBar progress={progress} />
        </View>

        <View style={styles.questionCard}>
          <View style={styles.questionHeader}>
            <View style={styles.iconContainer}>
              <Text style={styles.questionIcon}>{currentQuestion.icon}</Text>
            </View>
            <Text style={styles.questionTitle}>{currentQuestion.title}</Text>
            <Text style={styles.questionSubtitle}>{currentQuestion.subtitle}</Text>
          </View>

          <ScrollView style={styles.optionsContainer} showsVerticalScrollIndicator={false}>
            {currentQuestion.options.map((option) => {
              const isSelected = currentQuestion.type === 'multiple'
                ? (answers[currentQuestion.id] as string[] || []).includes(option)
                : answers[currentQuestion.id] === option;

              return (
                <TouchableOpacity
                  key={option}
                  onPress={() => handleAnswer(currentQuestion.id, option)}
                  style={[
                    styles.optionButton,
                    isSelected ? styles.selectedOption : styles.unselectedOption
                  ]}
                >
                  <Text style={[
                    styles.optionText,
                    isSelected ? styles.selectedOptionText : styles.unselectedOptionText
                  ]}>
                    {option}
                  </Text>
                  <View style={[
                    styles.radioButton,
                    isSelected ? styles.selectedRadio : styles.unselectedRadio
                  ]}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.navigationContainer}>
            <TouchableOpacity
              style={[
                styles.navButton,
                styles.backButton,
                currentStep === 0 && styles.disabledButton
              ]}
              onPress={prevStep}
              disabled={currentStep === 0}
            >
              <Text style={[
                styles.backButtonText,
                currentStep === 0 && styles.disabledButtonText
              ]}>
                ← Back
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.navButton,
                styles.nextButton,
                !canProceed() && styles.disabledButton
              ]}
              onPress={nextStep}
              disabled={!canProceed()}
            >
              <Text style={[
                styles.nextButtonText,
                !canProceed() && styles.disabledButtonText
              ]}>
                {currentStep === questions.length - 1 ? 'Get My Plan' : 'Next'} →
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // ... keep all your existing styles
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  questionnaireContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  progressSection: {
    marginBottom: 32,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    marginTop: 15,
  },
  stepText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#5C6BC0',
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#5C6BC0',
  },
  progressContainer: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#5C6BC0',
    borderRadius: 4,
  },
  questionCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  questionHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#5C6BC0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  questionIcon: {
    fontSize: 32,
  },
  questionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
  },
  questionSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  optionsContainer: {
    flex: 1,
    marginBottom: 24,
  },
  optionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
  },
  selectedOption: {
    borderColor: '#5C6BC0',
    backgroundColor: '#eff6ff',
  },
  unselectedOption: {
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  selectedOptionText: {
    color: '#5C6BC0',
  },
  unselectedOptionText: {
    color: '#1e293b',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedRadio: {
    borderColor: '#5C6BC0',
    backgroundColor: '#5C6BC0',
  },
  unselectedRadio: {
    borderColor: '#94a3b8',
    backgroundColor: '#ffffff',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  backButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  nextButton: {
    backgroundColor: '#5C6BC0',
  },
  disabledButton: {
    opacity: 0.5,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748b',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
  disabledButtonText: {
    color: '#94a3b8',
  },
});

export default Skincare;