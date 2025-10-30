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
      "name": "createCampaign",
      "discriminator": [
        111,
        131,
        187,
        98,
        160,
        193,
        114,
        244
      ],
      "accounts": [
        {
          "name": "campaign",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  97,
                  109,
                  112,
                  97,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "arg",
                "path": "campaignId"
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
          "name": "campaignId",
          "type": "string"
        },
        {
          "name": "semester",
          "type": "string"
        },
        {
          "name": "campaignType",
          "type": "u8"
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
      "name": "initializeFinalRoot",
      "discriminator": [
        208,
        43,
        2,
        5,
        215,
        226,
        124,
        136
      ],
      "accounts": [
        {
          "name": "finalRoot",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  110,
                  105,
                  118,
                  101,
                  114,
                  115,
                  105,
                  116,
                  121,
                  95,
                  112,
                  101,
                  114,
                  102,
                  111,
                  114,
                  109,
                  97,
                  110,
                  99,
                  101
                ]
              },
              {
                "kind": "arg",
                "path": "universityId"
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
          "name": "universityId",
          "type": "string"
        }
      ]
    },
    {
      "name": "publishCampaignResults",
      "discriminator": [
        32,
        231,
        48,
        179,
        88,
        154,
        199,
        142
      ],
      "accounts": [
        {
          "name": "campaign",
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
      "args": [
        {
          "name": "merkleRoot",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "submitBatchResponses",
      "discriminator": [
        42,
        147,
        129,
        63,
        213,
        4,
        8,
        93
      ],
      "accounts": [
        {
          "name": "campaign",
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
      "args": [
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
          "name": "encryptedResponses",
          "type": {
            "vec": {
              "array": [
                "u8",
                256
              ]
            }
          }
        }
      ]
    },
    {
      "name": "updateFinalMerkleRoot",
      "discriminator": [
        129,
        22,
        150,
        101,
        100,
        217,
        246,
        156
      ],
      "accounts": [
        {
          "name": "finalRoot",
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
      "args": [
        {
          "name": "finalMerkleRoot",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "surveyCampaign",
      "discriminator": [
        72,
        247,
        60,
        211,
        127,
        228,
        78,
        166
      ]
    },
    {
      "name": "universityPerformance",
      "discriminator": [
        245,
        103,
        73,
        157,
        230,
        183,
        132,
        22
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "campaignAlreadyPublished",
      "msg": "Campaign is already published"
    },
    {
      "code": 6001,
      "name": "campaignIdTooLong",
      "msg": "Campaign ID is too long"
    },
    {
      "code": 6002,
      "name": "semesterTooLong",
      "msg": "Semester is too long"
    },
    {
      "code": 6003,
      "name": "invalidCampaignType",
      "msg": "Invalid campaign type"
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
      "name": "noResponsesSubmitted",
      "msg": "No responses submitted"
    },
    {
      "code": 6007,
      "name": "mismatchedDataLength",
      "msg": "Mismatched data length"
    }
  ],
  "types": [
    {
      "name": "surveyCampaign",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "campaignId",
            "type": "string"
          },
          {
            "name": "semester",
            "type": "string"
          },
          {
            "name": "campaignType",
            "type": "u8"
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
            "name": "encryptedResponses",
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
    },
    {
      "name": "universityPerformance",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "universityId",
            "type": "string"
          },
          {
            "name": "totalCampaigns",
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
            "name": "finalMerkleRoot",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    }
  ]
};
