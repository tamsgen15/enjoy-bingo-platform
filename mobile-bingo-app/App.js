import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Dimensions,
  SafeAreaView,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BINGO_CARDS } from './BingoCardsData';

const { width } = Dimensions.get('window');
const cardWidth = (width - 60) / 2; // 2 columns with margins

const BingoCard = ({ cardNumber, markedNumbers, onMarkNumber, size = 'normal' }) => {
  const card = BINGO_CARDS[cardNumber];
  if (!card) return null;

  const columns = [
    { letter: 'B', numbers: card.b, color: '#3B82F6' },
    { letter: 'I', numbers: card.i, color: '#EF4444' },
    { letter: 'N', numbers: card.n, color: '#F59E0B' },
    { letter: 'G', numbers: card.g, color: '#10B981' },
    { letter: 'O', numbers: card.o, color: '#F97316' }
  ];

  const cellSize = size === 'small' ? 22 : 35;
  const fontSize = size === 'small' ? 10 : 14;

  return (
    <View style={[styles.bingoCard, { width: size === 'small' ? cardWidth : width - 40 }]}>
      <Text style={styles.cardTitle}>Card #{cardNumber}</Text>
      
      {/* Header */}
      <View style={styles.headerRow}>
        {columns.map((col) => (
          <View key={col.letter} style={[styles.headerCell, { backgroundColor: col.color, width: cellSize, height: cellSize }]}>
            <Text style={[styles.headerText, { fontSize }]}>{col.letter}</Text>
          </View>
        ))}
      </View>
      
      {/* Numbers */}
      {[0, 1, 2, 3, 4].map((row) => (
        <View key={row} style={styles.numberRow}>
          {columns.map((col, colIndex) => {
            // Free space in center
            if (colIndex === 2 && row === 2) {
              return (
                <View key={`${col.letter}-${row}`} style={[styles.numberCell, styles.freeCell, { width: cellSize, height: cellSize }]}>
                  <Text style={[styles.freeText, { fontSize: fontSize - 2 }]}>FREE</Text>
                </View>
              );
            }
            
            const number = col.numbers[row];
            const isMarked = markedNumbers.includes(number);
            
            return (
              <TouchableOpacity
                key={`${col.letter}-${row}`}
                style={[
                  styles.numberCell,
                  { width: cellSize, height: cellSize },
                  isMarked && styles.markedCell
                ]}
                onPress={() => onMarkNumber(number)}
              >
                <Text style={[styles.numberText, { fontSize }, isMarked && styles.markedText]}>
                  {number}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
};

export default function App() {
  const [selectedCards, setSelectedCards] = useState([]);
  const [markedNumbers, setMarkedNumbers] = useState({});
  const [gameActive, setGameActive] = useState(false);

  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    try {
      const savedCards = await AsyncStorage.getItem('selectedCards');
      const savedMarked = await AsyncStorage.getItem('markedNumbers');
      
      if (savedCards) setSelectedCards(JSON.parse(savedCards));
      if (savedMarked) setMarkedNumbers(JSON.parse(savedMarked));
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
  };

  const saveData = async () => {
    try {
      await AsyncStorage.setItem('selectedCards', JSON.stringify(selectedCards));
      await AsyncStorage.setItem('markedNumbers', JSON.stringify(markedNumbers));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  const selectCard = (cardNumber) => {
    if (selectedCards.length >= 4) {
      Alert.alert('Maximum Cards', 'You can select maximum 4 cards at a time');
      return;
    }
    
    if (selectedCards.includes(cardNumber)) {
      Alert.alert('Card Already Selected', `Card #${cardNumber} is already selected`);
      return;
    }

    const newSelectedCards = [...selectedCards, cardNumber];
    setSelectedCards(newSelectedCards);
    setMarkedNumbers(prev => ({ ...prev, [cardNumber]: [] }));
    saveData();
  };

  const removeCard = (cardNumber) => {
    setSelectedCards(prev => prev.filter(card => card !== cardNumber));
    setMarkedNumbers(prev => {
      const newMarked = { ...prev };
      delete newMarked[cardNumber];
      return newMarked;
    });
    saveData();
  };

  const markNumber = (cardNumber, number) => {
    setMarkedNumbers(prev => {
      const cardMarked = prev[cardNumber] || [];
      const newMarked = cardMarked.includes(number)
        ? cardMarked.filter(n => n !== number)
        : [...cardMarked, number];
      
      const updated = { ...prev, [cardNumber]: newMarked };
      AsyncStorage.setItem('markedNumbers', JSON.stringify(updated));
      return updated;
    });
  };

  const clearAllMarks = () => {
    Alert.alert(
      'Clear All Marks',
      'Are you sure you want to clear all marked numbers?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          onPress: () => {
            const clearedMarked = {};
            selectedCards.forEach(card => {
              clearedMarked[card] = [];
            });
            setMarkedNumbers(clearedMarked);
            AsyncStorage.setItem('markedNumbers', JSON.stringify(clearedMarked));
          }
        }
      ]
    );
  };

  const callBingo = () => {
    Alert.alert(
      'BINGO!',
      `Shout "BINGO!" to claim your prize!\n\nYour cards: ${selectedCards.join(', ')}`,
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Image source={require('./logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>ENJOY BINGO</Text>
        
        {selectedCards.length === 0 ? (
          <View style={styles.selectionContainer}>
            <Text style={styles.instructionText}>
              Select your bingo cards (1-100)
            </Text>
            <Text style={styles.subText}>
              Tell admin your preferred card numbers to get assigned
            </Text>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardGridScroll}>
              <View style={styles.cardGrid}>
                {Array.from({ length: 100 }, (_, i) => i + 1).map(cardNumber => (
                  <TouchableOpacity
                    key={cardNumber}
                    style={styles.cardSelector}
                    onPress={() => selectCard(cardNumber)}
                  >
                    <Text style={styles.cardSelectorText}>{cardNumber}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            
            <Text style={styles.noteText}>
              Scroll to see all 100 cards available
            </Text>
          </View>
        ) : (
          <View style={styles.gameContainer}>
            <View style={styles.controlsContainer}>
              <TouchableOpacity style={styles.bingoButton} onPress={callBingo}>
                <Text style={styles.bingoButtonText}>CALL BINGO!</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.clearButton} onPress={clearAllMarks}>
                <Text style={styles.clearButtonText}>Clear Marks</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.selectedCardsText}>
              Your Cards: {selectedCards.join(', ')}
            </Text>

            <View style={styles.cardsContainer}>
              {selectedCards.map(cardNumber => (
                <View key={cardNumber} style={styles.cardWrapper}>
                  <BingoCard
                    cardNumber={cardNumber}
                    markedNumbers={markedNumbers[cardNumber] || []}
                    onMarkNumber={(number) => markNumber(cardNumber, number)}
                    size={selectedCards.length > 2 ? 'small' : 'normal'}
                  />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeCard(cardNumber)}
                  >
                    <Text style={styles.removeButtonText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <Text style={styles.instructionText}>
              Tap numbers to mark them when called
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e3a8a',
  },
  scrollContainer: {
    padding: 20,
  },
  logo: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 2,
  },
  selectionContainer: {
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
  },
  subText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 20,
  },
  cardGridScroll: {
    maxHeight: 300,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 10,
    paddingHorizontal: 10,
    width: 600,
  },
  cardSelector: {
    width: 50,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
  },
  cardSelectorText: {
    color: 'white',
    fontWeight: 'bold',
  },
  noteText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 20,
  },
  gameContainer: {
    alignItems: 'center',
  },
  controlsContainer: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
  },
  bingoButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    elevation: 5,
  },
  bingoButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  clearButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 25,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  selectedCardsText: {
    color: 'white',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 15,
  },
  cardWrapper: {
    alignItems: 'center',
  },
  bingoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 10,
    elevation: 5,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1e3a8a',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  headerCell: {
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    color: 'white',
    fontWeight: 'bold',
  },
  numberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  numberCell: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberText: {
    color: '#1e293b',
    fontWeight: '600',
  },
  markedCell: {
    backgroundColor: '#3b82f6',
  },
  markedText: {
    color: 'white',
  },
  freeCell: {
    backgroundColor: '#e2e8f0',
  },
  freeText: {
    color: '#64748b',
    fontWeight: 'bold',
  },
  removeButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15,
  },
  removeButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});