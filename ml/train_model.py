import tensorflow as tf
import pathlib
import matplotlib.pyplot as plt

def get_datasets(data_dir: str, img_height: int, img_width: int, batch_size: int,
                 validation_split: float = 0.2, seed: int = 123):
    """
    Loads training and validation datasets from a directory that contains subfolders for each class.
    """
    data_path = pathlib.Path(data_dir)
    train_ds = tf.keras.preprocessing.image_dataset_from_directory(
        data_path,
        validation_split=validation_split,
        subset="training",
        seed=seed,
        image_size=(img_height, img_width),
        batch_size=batch_size
    )
    val_ds = tf.keras.preprocessing.image_dataset_from_directory(
        data_path,
        validation_split=validation_split,
        subset="validation",
        seed=seed,
        image_size=(img_height, img_width),
        batch_size=batch_size
    )
    return train_ds, val_ds

def configure_dataset(ds: tf.data.Dataset, shuffle: bool = True):
    """
    Configures the dataset for performance with caching and prefetching.
    """
    AUTOTUNE = tf.data.AUTOTUNE
    if shuffle:
        ds = ds.shuffle(1000)
    return ds.cache().prefetch(buffer_size=AUTOTUNE)

def build_model(input_shape, num_classes, data_augmentation=None):
    """
    Constructs a CNN model using data augmentation and normalization layers.
    """
    model = tf.keras.Sequential()
    # Optional: apply data augmentation if provided.
    if data_augmentation:
        model.add(data_augmentation)
    # Normalize pixel values to [0, 1].
    model.add(tf.keras.layers.Rescaling(1.0 / 255, input_shape=input_shape))
    
    # Convolutional layers.
    model.add(tf.keras.layers.Conv2D(16, (3, 3), activation='relu'))
    model.add(tf.keras.layers.MaxPooling2D())
    model.add(tf.keras.layers.Conv2D(32, (3, 3), activation='relu'))
    model.add(tf.keras.layers.MaxPooling2D())
    model.add(tf.keras.layers.Conv2D(64, (3, 3), activation='relu'))
    model.add(tf.keras.layers.MaxPooling2D())
    
    # Fully connected layers.
    model.add(tf.keras.layers.Flatten())
    model.add(tf.keras.layers.Dense(128, activation='relu'))
    model.add(tf.keras.layers.Dense(num_classes, activation='softmax'))
    
    return model

def plot_training_history(history):
    """
    Plots training and validation accuracy over epochs.
    """
    acc = history.history['accuracy']
    val_acc = history.history['val_accuracy']
    epochs_range = range(len(acc))
    
    plt.figure(figsize=(8, 6))
    plt.plot(epochs_range, acc, label='Training Accuracy')
    plt.plot(epochs_range, val_acc, label='Validation Accuracy')
    plt.legend(loc='lower right')
    plt.title('Training and Validation Accuracy')
    plt.show()

def main():
    # Hyperparameters and dataset configuration.
    data_dir = "/dataset"
    batch_size = 32
    img_height = 224
    img_width = 224
    validation_split = 0.2
    seed = 123

    # Load datasets.
    train_ds, val_ds = get_datasets(data_dir, img_height, img_width, batch_size,
                                    validation_split, seed)
    class_names = train_ds.class_names
    num_classes = len(class_names)
    print("Detected classes:", class_names)

    # Optimize the datasets.
    train_ds = configure_dataset(train_ds, shuffle=True)
    val_ds = configure_dataset(val_ds, shuffle=False)

    # Define data augmentation layers.
    data_augmentation = tf.keras.Sequential([
        tf.keras.layers.RandomFlip("horizontal_and_vertical"),
        tf.keras.layers.RandomRotation(0.2)
    ])

    # Build and compile the model.
    input_shape = (img_height, img_width, 3)
    model = build_model(input_shape, num_classes, data_augmentation)
    model.compile(optimizer='adam',
                  loss='sparse_categorical_crossentropy',
                  metrics=['accuracy'])
    
    # Callbacks: early stopping and model checkpointing.
    callbacks = [
        tf.keras.callbacks.EarlyStopping(monitor='val_loss', patience=3, restore_best_weights=True),
        tf.keras.callbacks.ModelCheckpoint(filepath='best_damage_model.h5', monitor='val_loss', save_best_only=True)
    ]
    
    # Train the model.
    epochs = 20  # Adjust epochs based on your needs.
    history = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=epochs,
        callbacks=callbacks
    )

    model.summary()
    plot_training_history(history)
    
    # Save the final model.
    model.save("damage_assessment_model_final.h5")

if __name__ == "__main__":
    main()

#Code from Prof. Xing for referance remove after functional
# Packages
'''
import os
import torch
import torchvision.transforms as transforms
from torchvision import datasets
from torch.utils.data import DataLoader, random_split
import torch.nn as nn
import torchvision.models as models
import torch.optim as optim
import matplotlib.pyplot as plt
from sklearn.metrics import confusion_matrix, ConfusionMatrixDisplay, accuracy_score
import numpy as np
'''
#Loading Dataset
'''
import torch
import torchvision.transforms as transforms
from torchvision import datasets
from torch.utils.data import DataLoader, random_split

# Check for GPU availability
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Dataset path (Google Drive or Local)
dataset_path = "/content/drive/MyDrive/SDNET2018"  # Change this to your dataset path

# Define image transformations
transform = transforms.Compose([
    transforms.Resize((224, 224)),  # ResNet requires 224x224 input
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(10),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.5], std=[0.5])
])

# Load dataset
full_dataset = datasets.ImageFolder(root=dataset_path, transform=transform)

# Calculate split sizes
total_size = len(full_dataset)
train_size = int(0.1 * total_size)  # 10% for training
val_size = int(0.05 * total_size)   # 5% for validation
test_size = total_size - train_size - val_size  # Remaining 85% (ignored)

# Split dataset
train_dataset, val_dataset, _ = random_split(full_dataset, [train_size, val_size, test_size])

# Create DataLoaders
train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False)

print(f"Dataset Loaded: {len(train_dataset)} training images, {len(val_dataset)} validation images")
'''
#Load the deep learning model
'''
# Load Pretrained ResNet18
model = models.resnet18(pretrained=True)

# Modify the last layer for binary classification (2 classes)
num_ftrs = model.fc.in_features
model.fc = nn.Sequential(
    nn.Linear(num_ftrs, 512),
    nn.ReLU(),
    nn.Dropout(0.5),
    nn.Linear(512, 1),
    nn.Sigmoid()  # Output a probability for binary classification
)

# Move model to GPU if available
model = model.to(device)
'''
#Define loss function and optimizer
'''
# Define loss function and optimizer
# Use BCEWithLogitsLoss instead of BCELoss
criterion = nn.BCEWithLogitsLoss()
optimizer = optim.Adam(model.parameters(), lr=0.0001)
'''
#Train the model
'''
# Store metrics for visualization
train_losses = []
val_losses = []
train_accuracies = []
val_accuracies = []

num_epochs = 5

for epoch in range(num_epochs):
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0

    for images, labels in train_loader:
        images, labels = images.to(device), labels.to(device).float().unsqueeze(1)  # Convert labels to float

        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()

        running_loss += loss.item()
        predicted = (outputs > 0.5).float()
        correct += (predicted == labels).sum().item()
        total += labels.size(0)

    train_loss = running_loss / len(train_loader)
    train_accuracy = correct / total
    train_losses.append(train_loss)
    train_accuracies.append(train_accuracy)

    # Validation Step
    model.eval()
    val_loss = 0.0
    correct = 0
    total = 0

    with torch.no_grad():
        for images, labels in val_loader:
            images, labels = images.to(device), labels.to(device).float().unsqueeze(1)
            outputs = model(images)
            loss = criterion(outputs, labels)
            val_loss += loss.item()

            predicted = (outputs > 0.5).float()
            correct += (predicted == labels).sum().item()
            total += labels.size(0)

    val_loss = val_loss / len(val_loader)
    val_accuracy = correct / total
    val_losses.append(val_loss)
    val_accuracies.append(val_accuracy)

    print(f"Epoch {epoch+1}/{num_epochs}, Train Loss: {train_loss:.4f}, Train Acc: {train_accuracy*100:.2f}%, Val Loss: {val_loss:.4f}, Val Acc: {val_accuracy*100:.2f}%")

print("Training Complete!")

# Save trained model
torch.save(model.state_dict(), "/content/drive/MyDrive/SDNET2018/resnet_crack_detection.pth")
print("Model saved successfully!")

# Load model later
model = models.resnet18(pretrained=False)  # Load ResNet18 again
model.fc = nn.Sequential(
    nn.Linear(num_ftrs, 512),
    nn.ReLU(),
    nn.Dropout(0.5),
    nn.Linear(512, 1),
    nn.Sigmoid()
)
model.load_state_dict(torch.load("/content/drive/MyDrive/SDNET2018/resnet_crack_detection.pth"))
model.to(device)
model.eval()

import matplotlib.pyplot as plt
import numpy as np
import random

# Extract images from the test dataset
def get_balanced_samples(dataset, num_samples=8):
    cracked_images, non_cracked_images = [], []
    cracked_labels, non_cracked_labels = [], []

    for img, label in dataset:
        if label == 1 and len(cracked_images) < num_samples:  # Cracked
            cracked_images.append(img)
            cracked_labels.append(label)
        elif label == 0 and len(non_cracked_images) < num_samples:  # Non-Cracked
            non_cracked_images.append(img)
            non_cracked_labels.append(label)

        if len(cracked_images) == num_samples and len(non_cracked_images) == num_samples:
            break

    # Merge and shuffle
    images = cracked_images + non_cracked_images
    labels = cracked_labels + non_cracked_labels
    combined = list(zip(images, labels))
    random.shuffle(combined)

    return zip(*combined)

# Get 8 cracked & 8 non-cracked images (total 16)
num_per_class = 8  # Adjust based on visualization needs
images, labels = get_balanced_samples(test_dataset, num_per_class)

# Convert to tensor batch
images = torch.stack(images).to(device)
labels = torch.tensor(labels).to(device).float().unsqueeze(1)

# Get model predictions
model.eval()
with torch.no_grad():
    outputs = model(images)
    preds = (outputs > 0.5).float()

# Convert images back to displayable format
images = images.cpu().numpy().transpose((0, 2, 3, 1))  # Convert from Tensor format

# Undo normalization for visualization
images = (images * 0.5) + 0.5  # Rescale from [-1,1] to [0,1]

# Plot predictions
fig, axes = plt.subplots(4, 4, figsize=(10, 10))
axes = axes.flatten()

for i in range(len(images)):
    img = images[i]
    true_label = "Cracked" if labels[i].item() == 1 else "Non-Cracked"
    pred_label = "Cracked" if preds[i].item() == 1 else "Non-Cracked"
    color = "green" if true_label == pred_label else "red"  # Green = correct, Red = incorrect

    axes[i].imshow(img)
    axes[i].set_title(f"True: {true_label}\nPred: {pred_label}", color=color, fontsize=10)
    axes[i].axis("off")

plt.tight_layout()
plt.show()

'''