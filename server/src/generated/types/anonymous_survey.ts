/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/anonymous_survey.json`.
 */
export type AnonymousSurvey = {
  "address": "mNtgDCdiUe415LDYWgD1n8zuLiPVmgqSdbUL1zHtaLq",
  "metadata": {
    "name": "anonymousSurvey",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "createSurvey",
      "discriminator": [
        25,
        36,
        97,
        69,
        88,
        88,
        54,
        222
      ],
      "accounts": [
        {
          "name": "survey",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  117,
                  114,
                  118,
                  101,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "arg",
                "path": "surveyId"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "surveyId",
          "type": "string"
        },
        {
          "name": "title",
          "type": "string"
        },
        {
          "name": "description",
          "type": "string"
        },
        {
          "name": "blindSignaturePublicKey",
          "type": "bytes"
        },
        {
          "name": "encryptionPublicKey",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "publishResults",
      "discriminator": [
        198,
        64,
        157,
        180,
        215,
        21,
        224,
        119
      ],
      "accounts": [
        {
          "name": "survey",
          "writable": true
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "submitResponse",
      "discriminator": [
        85,
        190,
        208,
        119,
        243,
        52,
        133,
        90
      ],
      "accounts": [
        {
          "name": "survey",
          "writable": true
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "commitment",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "encryptedAnswer",
          "type": {
            "array": [
              "u8",
              256
            ]
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "survey",
      "discriminator": [
        146,
        73,
        17,
        4,
        6,
        233,
        167,
        141
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "surveyAlreadyPublished",
      "msg": "Survey is already published"
    },
    {
      "code": 6001,
      "name": "surveyIdTooLong",
      "msg": "Survey ID is too long"
    },
    {
      "code": 6002,
      "name": "titleTooLong",
      "msg": "Title is too long"
    },
    {
      "code": 6003,
      "name": "descriptionTooLong",
      "msg": "Description is too long"
    },
    {
      "code": 6004,
      "name": "publicKeyTooLong",
      "msg": "Public key is too long"
    },
    {
      "code": 6005,
      "name": "unauthorized",
      "msg": "unauthorized"
    },
    {
      "code": 6006,
      "name": "surveyFull",
      "msg": "Survey has reached maximum response limit"
    }
  ],
  "types": [
    {
      "name": "survey",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "surveyId",
            "type": "string"
          },
          {
            "name": "title",
            "type": "string"
          },
          {
            "name": "description",
            "type": "string"
          },
          {
            "name": "totalResponses",
            "type": "u32"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "updatedAt",
            "type": "i64"
          },
          {
            "name": "isPublished",
            "type": "bool"
          },
          {
            "name": "merkleRoot",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "encryptedAnswers",
            "type": {
              "vec": {
                "array": [
                  "u8",
                  256
                ]
              }
            }
          },
          {
            "name": "commitments",
            "type": {
              "vec": {
                "array": [
                  "u8",
                  32
                ]
              }
            }
          },
          {
            "name": "blindSignaturePublicKey",
            "type": "bytes"
          },
          {
            "name": "encryptionPublicKey",
            "type": "bytes"
          }
        ]
      }
    }
  ]
};
