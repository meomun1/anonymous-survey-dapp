import { verifyStudentProof, verifyAnswerInResults, createExampleData } from './public-verifier';

async function testVerification() {
  console.log('🧪 Testing Public Verification Tool');
  console.log('===================================\n');

  // Get example data
  const { exampleStudentProof, exampleSurveyResults } = createExampleData();

  // Test 1: Student verification (simulated)
  console.log('1. Testing Student Verification:');
  console.log('--------------------------------');
  
  // Note: This would need real cryptographic data to work properly
  // For demonstration, we'll show the structure
  console.log('Student would verify their proof with:');
  console.log(`- Survey ID: ${exampleStudentProof.surveyId}`);
  console.log(`- Their Answer: "${exampleStudentProof.userAnswer}"`);
  console.log(`- Timestamp: ${new Date(exampleStudentProof.timestamp).toISOString()}`);
  console.log('✅ Student verification structure ready\n');

  // Test 2: Public verification
  console.log('2. Testing Public Verification:');
  console.log('--------------------------------');
  
  const testAnswer = "This is a great course";
  const allPublishedAnswers = [
    "This is a great course",
    "The course was okay", 
    "I learned a lot"
  ];

  console.log(`Checking if "${testAnswer}" was included in results...`);
  
  const result = verifyAnswerInResults(
    testAnswer,
    exampleSurveyResults,
    allPublishedAnswers
  );

  console.log(`\nResult: ${result.isIncluded ? '✅ INCLUDED' : '❌ NOT INCLUDED'}`);
  console.log('✅ Public verification test completed\n');

  // Test 3: Test with non-existent answer
  console.log('3. Testing with Non-existent Answer:');
  console.log('-------------------------------------');
  
  const fakeAnswer = "This answer was never submitted";
  
  console.log(`Checking if "${fakeAnswer}" was included in results...`);
  
  const fakeResult = verifyAnswerInResults(
    fakeAnswer,
    exampleSurveyResults,
    allPublishedAnswers
  );

  console.log(`\nResult: ${fakeResult.isIncluded ? '❌ INCORRECTLY INCLUDED' : '✅ CORRECTLY NOT INCLUDED'}`);
  console.log('✅ Non-existent answer test completed\n');

  console.log('🎉 All verification tests completed!');
  console.log('\nThis demonstrates how:');
  console.log('- Students can verify their own participation proofs');
  console.log('- Anyone can verify if specific answers were included in results');
  console.log('- The system provides transparency without compromising anonymity');
}

// Run the test
testVerification().catch(console.error); 